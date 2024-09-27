import { prisma } from "../client/prisma.js";
import bankAccountRepo from "../repository/bankAccountRepo.js";
import botResponseRepo from "../repository/botResponseRepo.js";
import payInRepo from "../repository/payInRepo.js";
import { nanoid } from "nanoid";

class PayInService {
  async generatePayInUrl(getMerchantRes, payInData) {
    const _10_MINUTES = 1000 * 60 * 10;
    const expirationDate = Math.floor((new Date().getTime() + _10_MINUTES) / 1000);

    const data = {
      upi_short_code: nanoid(5), // code added by us
      amount: 0, // as starting amount will be zero
      status: "INITIATED",
      currency: "INR",
      merchant_order_id: payInData?.merchant_order_id, // for time being we are using this
      user_id: payInData?.user_id,
      // isTest:payInData?.isTest,
      // bank_acc_id: bankAccountLinkRes?.bankAccountId,   this is done bcs bank will be assigned after the submission of amount in frontend.
      return_url: getMerchantRes?.return_url,
      notify_url: getMerchantRes?.notify_url,
      merchant_id: getMerchantRes?.id,
      expirationDate,
    };
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
      bank_name: bankDetails?.bankAccount?.bank_name,
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
    userSubmittedUtr,
    utr,
    payInId,
    dur,
    status,
    bankName,
    filterToday
  ) {
    const Data = await prisma.payin.updateMany({
      where: {
        status: "INITIATED",
        expirationDate: {
          lt: Math.floor(new Date().getTime() / 1000), // Compare if expirationDate is less than the current time
        },
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
      ...(userSubmittedUtr && {
        user_submitted_utr: { contains: userSubmittedUtr, mode: "insensitive" },
      }),
      ...(utr && { utr: { contains: utr, mode: "insensitive" } }),
      ...(userId && { user_id: { equals: userId } }),
      ...(payInId && { id: { equals: payInId } }),
      ...(upiShortCode && {
        upi_short_code: { contains: upiShortCode, mode: "insensitive" },
      }),
      ...(confirmed && { confirmed: { equals: confirmed } }),
      ...(amount && { amount: { equals: amount } }),
      ...(utr && { utr: { equals: utr } }),
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
      ...(bankName && {
        bank_name: { contains: bankName, mode: "insensitive" },
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

    const totalRecords = await prisma.payin.count({
      where: filters,
    });

    // Handle BigInt serialization issue
    const serializedPayinData = payInData.map((payIn) => ({
      ...payIn,
      expirationDate: payIn.expirationDate
        ? payIn.expirationDate.toString()
        : null,
    }));

    return { payInData: serializedPayinData, totalRecords };
  }

  async getAllPayInDataByMerchant(merchantCode, startDate, endDate) {
    const dateFilter = {};
    if (startDate) {
      dateFilter.gte = new Date(startDate); // Greater than or equal to startDate
    }
    if (endDate) {
      let end = new Date(endDate);

      end.setDate(end.getDate() + 1);

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
        createdAt: dateFilter,
      },
    });

    const payOutData = await prisma.payout.findMany({
      where: {
        status: "SUCCESS",
        Merchant: {
          code: Array.isArray(merchantCode)
            ? { in: merchantCode }
            : merchantCode,
        },
        createdAt: dateFilter,
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
        createdAt: dateFilter,
      },
    });

    return { payInOutData: { payInData, payOutData, settlementData } };
  }

  async checkPayinStatus(payinId, merchantCode, merchantOrderId) {
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
  }

  async payinAssignment(payinId, merchantCode, merchantOrderId) {
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
  }

  async getAllPayInDataByVendor(vendorCode) {
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
      },
    });

    const payOutData = await prisma.payout.findMany({
      where: {
        status: "SUCCESS",
        vendor_code: Array.isArray(vendorCode)
          ? { in: vendorCode }
          : vendorCode,
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

    return { payInOutData: { payInData, payOutData, settlementData } };
  }

  //new service for pay in data
  async getAllPayInDataWithRange(merchantCodes, status, startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    // this method will get the entire day of both dates
    // from mid night 12 to mid night 12
    start.setUTCHours(0, 0, 0, 0)
    end.setUTCHours(23, 59, 59, 999)
    const condition = {
      Merchant: {
        code: {
          in: merchantCodes,
        }
      },
      createdAt: {
        gte: start,
        lte: end,
      },
    }
    if(status != "All"){
      condition.status = status;
    }
    const payInData = await prisma.payin.findMany({
      where: condition,
      include: {
        Merchant: true,
      },
    });
    return payInData;
  }
  async oneTimeExpire(payInId) {
    const expirePayInUrlRes = await prisma.payin.update({
        where: {
            id: payInId
        }, data: {
          one_time_used : true,
        }
    })
    return expirePayInUrlRes
}
}

export default new PayInService();
