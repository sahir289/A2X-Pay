import { prisma } from "../client/prisma.js";
import bankAccountRepo from "../repository/bankAccountRepo.js";
import botResponseRepo from "../repository/botResponseRepo.js";
import payInRepo from "../repository/payInRepo.js";
import { nanoid } from "nanoid";
import { logger } from "../utils/logger.js";

class PayInService {
  async generatePayInUrl(getMerchantRes, payInData, bankAccountLinkRes) {
    const _10_MINUTES = 1000 * 60 * 10;
    const expirationDate = Math.floor(
      (new Date().getTime() + _10_MINUTES) / 1000
    );

    const data = {
      upi_short_code: nanoid(5), // code added by us
      amount: payInData.amount || 0, // as starting amount will be zero
      status: "INITIATED",
      currency: "INR",
      merchant_order_id: payInData?.merchant_order_id, // for time being we are using this
      user_id: payInData?.user_id,
      // isTest:payInData?.isTest,
      // bank_acc_id: bankAccountLinkRes?.bankAccountId,   this is done bcs bank will be assigned after the submission of amount in frontend.
      return_url: payInData?.return_url,
      notify_url: getMerchantRes?.notify_url,
      merchant_id: getMerchantRes?.id,
      expirationDate,
    };

    if (payInData?.amount) {
      data.bank_acc_id = bankAccountLinkRes?.bankAccountId;
    }

    const payInUrlRes = await payInRepo.generatePayInUrl(data);

    const updatePayInUrlRes = {
      ...payInUrlRes,
      expirationDate,
    };
    return updatePayInUrlRes;
  }

  async assignedBankToPayInUrl(payInId, bankDetails, amount) {
    const data = {
      amount: amount, // this amount is given by the user
      status: "ASSIGNED",
      bank_acc_id: bankDetails?.bankAccountId,
      bank_name: bankDetails?.bankAccount?.ac_name, // changed bank_name from bank_name to ac_name
    };
    const payInUrlUpdateRes = await payInRepo.updatePayInData(payInId, data);
    const getBankRes = await bankAccountRepo.getBankByBankAccId(
      payInUrlUpdateRes?.bank_acc_id
    );

    const updatedResData = {
      ...getBankRes,
      code: payInUrlUpdateRes?.upi_short_code,
    };
    return updatedResData;
  }

  async getAllPayInData(
    skip,
    take,
    sno,
    upiShortCode,
    confirmed,
    amount,
    merchantOrderId,
    merchantCode,
    vendorCode,
    userId,
    // userSubmittedUtr,
    utr,
    payInId,
    dur,
    status,
    accountName, // changed variable from bankName to accountName
    filterToday
  ) {
    const Data = await prisma.payin.updateMany({
      where: {
        OR: [
          {
            status: "INITIATED",
            expirationDate: {
              lt: Math.floor(new Date().getTime() / 1000), // Check if expirationDate is less than the current time
            },
          },
          {
            status: "ASSIGNED",
            expirationDate: {
              lt: Math.floor(new Date().getTime() / 1000) - 1,
            },
          },
        ],
      },
      data: {
        status: "DROPPED",
      },
    });
    const now = new Date();
    const startOfDay = new Date(now.setHours(0, 0, 0, 0)).toISOString(); // Start of today
    const endOfDay = new Date(now.setHours(23, 59, 59, 999)).toISOString(); // End of today
    let bankIds = [];
    if (vendorCode) {
      const data = await prisma.bankAccount.findMany({
        where: {
          vendor_code: vendorCode,
        },
      });

      bankIds = data?.map((item) => item.id);
    }

    const SplitedCode = merchantCode?.split(",");
    const filters = {
      ...(sno && { sno: { equals: sno } }),
      ...(merchantOrderId && {
        merchant_order_id: { contains: merchantOrderId, mode: "insensitive" },
      }),
      ...(utr && {
        user_submitted_utr: { contains: utr, mode: "insensitive" },
      }),
      // ...(utr && { utr: { contains: utr, mode: "insensitive" } }),
      ...(userId && { user_id: { equals: userId } }),
      ...(payInId && { id: { equals: payInId } }),
      ...(upiShortCode && {
        upi_short_code: { contains: upiShortCode, mode: "insensitive" },
      }),
      ...(confirmed && { confirmed: { equals: confirmed } }),
      ...(amount && { amount: { equals: amount } }),
      // ...(utr && { utr: { equals: utr } }),
      ...(dur && { duration: { contains: dur, mode: "insensitive" } }),
      ...(status && { status: { equals: status } }),
      ...(merchantCode && {
        Merchant: {
          code: Array.isArray(SplitedCode) ? { in: SplitedCode } : merchantCode,
        },
      }),
      ...(vendorCode && {
        bank_acc_id: {
          in: bankIds,
        },
      }),
      ...(filterToday && {
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      }),
      // changed variable from bankName to accountName
      ...(accountName && {
        bank_name: { contains: accountName, mode: "insensitive" },
      }),
    };
    // const Data = await prisma.payin.findMany({
    //   where: {
    //     bank_acc_id: {
    //       in: []
    //     }
    //   }
    // })

    const payInData = await prisma.payin.findMany({
      where: filters,
      skip: skip,
      take: take,
      include: {
        Merchant: true,
      },
      orderBy: {
        sno: "desc",
      },
    });

    let payInData1;
    let filters1;
    if (payInData.length === 0) {
      filters1 = {
        ...(sno && { sno: { equals: sno } }),
        ...(merchantOrderId && {
          merchant_order_id: { contains: merchantOrderId, mode: "insensitive" },
        }),
        ...(utr && { utr: { contains: utr, mode: "insensitive" } }),
        ...(userId && { user_id: { equals: userId } }),
        ...(payInId && { id: { equals: payInId } }),
        ...(upiShortCode && {
          upi_short_code: { contains: upiShortCode, mode: "insensitive" },
        }),
        ...(confirmed && { confirmed: { equals: confirmed } }),
        ...(amount && { amount: { equals: amount } }),
        // ...(utr && { utr: { equals: utr } }),
        ...(dur && { duration: { contains: dur, mode: "insensitive" } }),
        ...(status && { status: { equals: status } }),
        ...(merchantCode && {
          Merchant: {
            code: Array.isArray(SplitedCode) ? { in: SplitedCode } : merchantCode,
          },
        }),
        ...(vendorCode && {
          bank_acc_id: {
            in: bankIds,
          },
        }),
        ...(filterToday && {
          createdAt: {
            gte: startOfDay,
            lte: endOfDay,
          },
        }),
        // changed variable from bankName to accountName
        ...(accountName && {
          bank_name: { contains: accountName, mode: "insensitive" },
        }),
      };
      payInData1 = await prisma.payin.findMany({
        where: filters1,
        skip: skip,
        take: take,
        include: {
          Merchant: true,
        },
        orderBy: {
          sno: "desc",
        },
      });
    }

    const totalRecords = await prisma.payin.count({
      where: payInData.length > 0 ? filters : filters1,
    });

    // Handle BigInt serialization issue
    let serializedPayinData;
    if (payInData.length > 0) {
      serializedPayinData = payInData.map((payIn) => ({
       ...payIn,
        expirationDate: payIn.expirationDate
         ? payIn.expirationDate.toString()
          : null,
      }));
    }
    else {
      serializedPayinData = payInData1.map((payIn) => ({
       ...payIn,
        expirationDate: payIn.expirationDate
         ? payIn.expirationDate.toString()
          : null,
      }));
    }

    return { payInData: serializedPayinData, totalRecords };
  }

  async getAllPayInDataByMerchant(merchantCode, startDate, endDate) {
    const dateFilter = {};
    if (startDate) {
      dateFilter.gte = new Date(startDate); // Greater than or equal to startDate
    }
    if (endDate) {
      let end = new Date(endDate);

      // end.setDate(end.getDate() + 1);

      dateFilter.lte = end; // Less than or equal to endDate
    }
    const payInData = await prisma.payin.findMany({
      where: {
        status: "SUCCESS",
        Merchant: {
          code: Array.isArray(merchantCode)
            ? { in: merchantCode }
            : merchantCode,
        },
        approved_at: dateFilter,
      },
    });

    const payOutData = await prisma.payout.findMany({
      where: {
        status: { in: ["SUCCESS", "REJECTED"] },
        Merchant: {
          code: Array.isArray(merchantCode)
            ? { in: merchantCode }
            : merchantCode,
        },
        approved_at: dateFilter,
      },
    });

    const reversedPayOutData = await prisma.payout.findMany({
      where: {
        status: "REJECTED",
        Merchant: {
          code: Array.isArray(merchantCode)
            ? { in: merchantCode }
            : merchantCode,
        },
        approved_at: {
          not: null,
        },
        rejected_at: dateFilter,
      },
    });

    const settlementData = await prisma.settlement.findMany({
      where: {
        status: "SUCCESS",
        Merchant: {
          code: Array.isArray(merchantCode)
            ? { in: merchantCode }
            : merchantCode,
        },
        updatedAt: dateFilter,
      },
    });

    const lienData = await prisma.lien.findMany({
      where: {
        Merchant: {
          code: Array.isArray(merchantCode)
            ? { in: merchantCode }
            : merchantCode,
        },
        updatedAt: dateFilter,
      },
    });

    return { payInOutData: { payInData, payOutData, reversedPayOutData, settlementData, lienData } };
  }

  async getMerchantsNetBalance(merchantCodes) {
    const codesArray = Array.isArray(merchantCodes)
      ? merchantCodes
      : [merchantCodes];

    const netBalanceResults = [];
    let totalNetBalance = 0;

    const payInData = await prisma.payin.aggregate({
      where: {
        status: "SUCCESS",
        Merchant: {
          code: { in: codesArray },
        },
        approved_at: {
          not: null,
        },
      },
      _sum: {
        confirmed: true,
        payin_commission: true,
      },
    });

    const payOutData = await prisma.payout.aggregate({
      where: {
        status: { in: ["SUCCESS", "REJECTED"] },
        Merchant: {
          code: { in: codesArray },
        },
        approved_at: {
          not: null,
        },
      },
      _sum: {
        amount: true,
        payout_commision: true,
      },
    });

    const reversedPayOutData = await prisma.payout.aggregate({
      where: {
        status: "REJECTED",
        Merchant: {
          code: { in: codesArray },
        },
        approved_at: {
          not: null,
        },
        rejected_at: {
          not: null,
        },
      },
      _sum: {
        amount: true,
        payout_commision: true,
      },
    });

    const settlementData = await prisma.settlement.aggregate({
      where: {
        status: "SUCCESS",
        Merchant: {
          code: { in: codesArray },
        },
      },
      _sum: {
        amount: true,
      },
    });

    const lienData = await prisma.lien.aggregate({
      where: {
        Merchant: {
          code: { in: codesArray },
        },
      },
      _sum: {
        amount: true,
      },
    });

    const deposit = Number(payInData._sum.confirmed || 0);
    const withdraw = Number(payOutData._sum.amount || 0);
    const reversedWithdraw = Number(reversedPayOutData._sum.amount || 0);
    const payInCommission = Number(payInData._sum.payin_commission || 0);
    const payOutCommission = Number(payOutData._sum.payout_commision || 0);
    const reversedPayOutCommission = Number(reversedPayOutData._sum.payout_commision || 0);
    const settlement = Number(settlementData._sum.amount || 0);
    const lien = Number(lienData._sum.amount || 0);

    const netBalance = deposit - withdraw - (payInCommission + payOutCommission - reversedPayOutCommission) - settlement - lien + reversedWithdraw;  
    const totalCommission = payInCommission + payOutCommission

    netBalanceResults.push({
      deposit,
      withdraw,
      payInCommission,
      payOutCommission,
      totalCommission,
      settlement,
      lien,
      netBalance,
    });

    totalNetBalance += netBalance;

    return {
      netBalanceResults,
      totalNetBalance,
    };
  }

  async getVendorsNetBalance(vendorCode) {
    let bankIds = [];
    if (vendorCode) {
      const data = await prisma.bankAccount.findMany({
        where: {
          vendor_code: Array.isArray(vendorCode)
            ? { in: vendorCode }
            : vendorCode,
        },
      });

      bankIds = data?.map((item) => item.id);
    }
    const filter = {
      ...(vendorCode && {
        bank_acc_id: {
          in: bankIds,
        },
      }),
    };
    const payInData = await prisma.payin.findMany({
      where: {
        status: "SUCCESS",
        ...filter,
        approved_at: {
          not: null,
        },
      },
    });
    
    const payOutData = await prisma.payout.findMany({
      where: {
        status: { in: ["SUCCESS", "REJECTED"] },
        vendor_code: Array.isArray(vendorCode)
          ? { in: vendorCode }
          : vendorCode,
        approved_at: {
          not: null,
        },
      },
    });

    const reversedPayOutData = await prisma.payout.findMany({
      where: {
        status: "REJECTED",
        vendor_code: Array.isArray(vendorCode)
          ? { in: vendorCode }
          : vendorCode,
        approved_at: {
          not: null,
        },
        rejected_at: {
          not: null,
        },
      },
    });

    const settlementData = await prisma.vendorSettlement.findMany({
      where: {
        status: "SUCCESS",
        Vendor: {
          vendor_code: Array.isArray(vendorCode)
            ? { in: vendorCode }
            : vendorCode,
        },
      },
    });

    let payInAmount = 0;
    let payInCommission = 0;
    let payInCount = 0;
    let payOutAmount = 0;
    let payOutCommission = 0;
    let payOutCount = 0;
    let reversedPayOutAmount = 0;
    let reversedPayOutCommission = 0;
    let settlementAmount = 0;

    payInData?.forEach((data) => {
      payInAmount += Number(data.amount);
      payInCommission += Number(0);
      payInCount += 1;
    });

    payOutData?.forEach((data) => {
      payOutAmount += Number(data.amount);
      payOutCommission += Number(0); // name changed to handle the spelling err.
      payOutCount += 1;
    });

    reversedPayOutData?.forEach((data) => {
      reversedPayOutAmount += Number(data.amount);
      reversedPayOutCommission += Number(0); // name changed to handle the spelling err.
    });

    settlementData?.forEach((data) => {
      settlementAmount += Number(data.amount);
    });

    const netBalance = payInAmount - payOutAmount - (payInCommission + payOutCommission - reversedPayOutCommission ) + settlementAmount + reversedPayOutAmount;

    return netBalance;
  }

  async checkPayinStatus(payinId, merchantCode, merchantOrderId) {
    const conditions = {
      Merchant: {
        code: merchantCode,
      },
      merchant_order_id: merchantOrderId
    };

    if (payinId !== null) {
      conditions.id = payinId;
    }
    
    const data = await prisma.payin.findFirst({
      where: conditions,
      include: {
        Merchant: true,
      },
    });
    return data;
  }

  async payinAssignment(payinId, merchantCode, merchantOrderId) {
    try {
      const data = await prisma.payin.findFirst({
        where: {
          id: payinId,
          merchant_id: merchantCode,
          merchant_order_id: merchantOrderId,
        },
        include: {
          Merchant: true,
        },
      });
      return data;
    } catch (error) {
      logger.info("getting issue while fetching", error);
    }
  }

  async getAllPayInDataByVendor(vendorCode, startDate, endDate) {
    let bankIds = [];
    let dateFilter = {};
    // if both start and end date provided then apply range filter
    if (startDate && endDate) {
      const end = new Date(endDate);
      // end.setDate(end.getDate() + 1)
      dateFilter = {
        updatedAt: {
          gte: new Date(startDate),
          lte: end,
        },
      };
    }
    if (vendorCode) {
      const data = await prisma.bankAccount.findMany({
        where: {
          vendor_code: Array.isArray(vendorCode)
            ? { in: vendorCode }
            : vendorCode,
        },
      });

      bankIds = data?.map((item) => item.id);
    }
    const filter = {
      ...(vendorCode && {
        bank_acc_id: {
          in: bankIds,
        },
      }),
    };
    const payInData = await prisma.payin.findMany({
      where: {
        status: "SUCCESS",
        ...filter,
        approved_at: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      },
    });
    
    const payOutData = await prisma.payout.findMany({
      where: {
        status: { in: ["SUCCESS", "REJECTED"] },
        vendor_code: Array.isArray(vendorCode)
          ? { in: vendorCode }
          : vendorCode,
        approved_at: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      },
    });

    const reversedPayOutData = await prisma.payout.findMany({
      where: {
        status: "REJECTED",
        vendor_code: Array.isArray(vendorCode)
          ? { in: vendorCode }
          : vendorCode,
        approved_at: {
          not: null,
        },
        rejected_at: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      },
    });

    const settlementData = await prisma.vendorSettlement.findMany({
      where: {
        status: "SUCCESS",
        Vendor: {
          vendor_code: Array.isArray(vendorCode)
            ? { in: vendorCode }
            : vendorCode,
          },
        ...dateFilter,
      },
    });

    // const lienData = await prisma.lien.findMany({
    //   where: {
    //     Vendor: {
    //       vendor_code: Array.isArray(vendorCode)
    //         ? { in: vendorCode }
    //         : vendorCode,
    //       ...dateFilter,
    //     },
    //   },
    // });
    return { payInOutData: { payInData, payOutData, settlementData, reversedPayOutData } };
  }

  //new service for pay in data
  async getAllPayInDataWithRange(merchantCodes, status, startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    try {
      const condition = {
        Merchant: {
          code: Array.isArray(merchantCodes)
            ? { in: merchantCodes }
            : merchantCodes,
        },
      };
  
      if (status != "All") {
        condition.status = status;
      }
  
      if (status === "SUCCESS") {
        condition.approved_at = {
          gte: start,
          lte: end,
        };
      } else {
        condition.updatedAt = {
          gte: start,
          lte: end,
        };
      }
      try {
        const pageSize = 1000;
        let page = 0;
        let allPayInData = [];

        while (true) {
          const payInData = await prisma.payin.findMany({
            where: condition,
            skip: page * pageSize,
            take: pageSize,
            include: {
              Merchant: true,
            },
            orderBy: status === "SUCCESS"
              ? { approved_at: "asc" }
              : { updatedAt: "asc" },
          });

          if (payInData.length === 0) {
            break;
          }

          allPayInData = [...allPayInData, ...payInData];
          page++;
        }
        return allPayInData;
      } catch (error) {
        logger.error('getting error while fetching pay in data', error);
      }
    } catch (error) {
      logger.error('getting error while downloading payin reports', error);
    }
  }
  
  async oneTimeExpire(payInId) {
    try {
      const expirePayInUrlRes = await prisma.payin.update({
        where: {
          id: payInId,
        },
        data: {
          one_time_used: true,
        },
      });
      return expirePayInUrlRes;
    } catch (error) {
      logger.log('getting issue in db while updating', error);
    }
  }

  async getPayInDetails(payInId) {
    const data = await prisma.payin.findFirst({
      where: {
        id: payInId,
      },
    });
    return data;
  }
}

export default new PayInService();
