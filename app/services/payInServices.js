import { prisma } from "../client/prisma.js";
import botResponseRepo from "../repository/botResponseRepo.js";
import payInRepo from "../repository/payInRepo.js"
import { nanoid } from 'nanoid'



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
            payin_commission: getMerchantRes?.payin_commission,
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

    async assignedBankToPayInUrl(payInId,bankDetails,amount){
        const data = {
            amount: amount,   // this amount is given by the user
            status: "ASSIGNED",
            bank_acc_id: bankDetails?.bankAccountId,   
        }
        const payInUrlUpdateRes = await payInRepo.updatePayInData(payInId,data)

        return payInUrlUpdateRes
    }

    async getAllPayInData(skip, take, upiShortCode, amount, merchantOrderId, merchantCode, userId, utr, payInId, dur, status, bankName, filterToday) {
        const now = new Date();
        const startOfDay = new Date(now.setHours(0, 0, 0, 0)).toISOString(); // Start of today
        const endOfDay = new Date(now.setHours(23, 59, 59, 999)).toISOString(); // End of today
    
        const filters = {
            ...(merchantOrderId && { merchant_order_id: { contains: merchantOrderId, mode: 'insensitive' } }),
            ...(utr && { utr: { contains: utr, mode: 'insensitive' } }),
            ...(userId && { user_id: { equals: userId } }),
            ...(payInId && { id: { equals: payInId } }),
            ...(upiShortCode && { upi_short_code: { contains: upiShortCode, mode: 'insensitive' } }),
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
                                bankAccount: true
                            }
                        }
                    }
                }
            }
        });
    
        const totalRecords = await prisma.payin.count({
            where: filters,
        });
    
        // Handle BigInt serialization issue
        const serializedPayinData = payInData.map(payIn => ({
            ...payIn,
            expirationDate: payIn.expirationDate ? payIn.expirationDate.toString() : null,
        }));
    
        return { payInData: serializedPayinData, totalRecords };
    }
    
}

export default new PayInService()