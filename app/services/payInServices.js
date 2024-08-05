import { prisma } from "../client/prisma.js";
import bankAccountRepo from "../repository/bankAccountRepo.js";
import botResponseRepo from "../repository/botResponseRepo.js";
import payInRepo from "../repository/payInRepo.js";
import { nanoid } from "nanoid";

class PayInService {
  async generatePayInUrl(getMerchantRes, payInData) {
    const _10_MINUTES = 1000 * 60 * 10;
    const expirationDate = new Date().getTime() + _10_MINUTES;

    const data = {
      upi_short_code: nanoid(5),       // code added by us
      amount: 0,   // as starting amount will be zero
      status: "INITIATED",
      currency: "INR",
      merchant_order_id: payInData?.merchant_order_id,  // for time being we are using this
      user_id: payInData?.user_id,
      // bank_acc_id: bankAccountLinkRes?.bankAccountId,   this is done bcs bank will be assigned after the submission of amount in frontend.
      return_url: getMerchantRes?.return_url,
      notify_url: getMerchantRes?.notify_url,
      merchant_id: getMerchantRes?.id,
      expirationDate: Math.floor(expirationDate / 1000)
    }
    const payInUrlRes = await payInRepo.generatePayInUrl(data)
    const updatePayInUrlRes = {
      ...payInUrlRes,
      expirationDate: Math.floor(expirationDate / 1000)
    }
    return updatePayInUrlRes

  }

  async assignedBankToPayInUrl(payInId, bankDetails, amount) {
    const data = {
      amount: amount,   // this amount is given by the user
      status: "ASSIGNED",
      bank_acc_id: bankDetails?.bankAccountId,

    }
    const payInUrlUpdateRes = await payInRepo.updatePayInData(payInId, data)
    const getBankRes = await bankAccountRepo.getBankByBankAccId(payInUrlUpdateRes?.bank_acc_id)

    const updatedResData = {
      ...getBankRes,
      code: payInUrlUpdateRes?.upi_short_code,
    };
    return updatedResData;
  }

  async getAllPayInData(skip, take, sno, upiShortCode, confirmed, amount, merchantOrderId, merchantCode, userId, userSubmittedUtr, utr, payInId, dur, status, bankName, filterToday) {
    const now = new Date();
    const startOfDay = new Date(now.setHours(0, 0, 0, 0)).toISOString(); // Start of today
    const endOfDay = new Date(now.setHours(23, 59, 59, 999)).toISOString(); // End of today

    const filters = {
      ...(sno && { sno: { equals: sno } }),
      ...(merchantOrderId && { merchant_order_id: { contains: merchantOrderId, mode: 'insensitive' } }),
      ...(userSubmittedUtr && { user_submitted_utr: { contains: userSubmittedUtr, mode: 'insensitive' } }),
      ...(utr && { utr: { contains: utr, mode: 'insensitive' } }),
      ...(userId && { user_id: { equals: userId } }),
      ...(payInId && { id: { equals: payInId } }),
      ...(upiShortCode && { upi_short_code: { contains: upiShortCode, mode: 'insensitive' } }),
      ...(confirmed && { confirmed: { equals: confirmed } }),
      ...(amount && { amount: { equals: amount } }),
      ...(utr && { utr: { equals: utr } }),
      ...(dur && { duration: { contains: dur, mode: 'insensitive' } }),
      ...(status && { status: { equals: status } }),
      ...(merchantCode && {
        Merchant: {
          code: { contains: merchantCode, mode: 'insensitive' }
        }
      }),
      ...(filterToday && {
        createdAt: {
          gte: startOfDay,
          lte: endOfDay
        }
      }),
      ...(bankName && {
        Merchant: {
          Merchant_Bank: {
            some: {
              bankAccount: {
                bank_name: { contains: bankName, mode: 'insensitive' }
              }
            }
          }
        }
      })
    };

    const payInData = await prisma.payin.findMany({
      where: filters,
      skip: skip,
      take: take,
      include: {
        Merchant: {
          include: {
            Merchant_Bank: {
              include: {
                bankAccount: true,
              },
            },
          },
        },
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

  async getAllPayInDataByMerchant(merchantCode) {
    const payInData = await prisma.payin.findMany({
      where: {
        status: "SUCCESS",
        Merchant: {
          code: Array.isArray(merchantCode)
            ? { in: merchantCode }
            : merchantCode,
        },
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
      },
    });

    return { payInOutData: { payInData, payOutData, settlementData } };
  }

  //new service for pay in data
  async getAllPayInDataNew(merchantCode, status, startDate, endDate) {
    const payInData = await prisma.payin.findMany({
      where: {
        status,
        Merchant: {
          code: merchantCode,
        },
        createdAt: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      },
    });
    return payInData;
  }
}


export default new PayInService();
