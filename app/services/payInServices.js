import { prisma } from "../client/prisma.js";
import botResponseRepo from "../repository/botResponseRepo.js";
import payInRepo from "../repository/payInRepo.js"
import { nanoid } from 'nanoid'



class PayInService {

    async generatePayInUrl(getMerchantRes, bankAccountLinkRes, payInData) {

        const _10_MINUTES = 1000 * 60 * 10;
        const expirationDate = new Date().getTime() + _10_MINUTES;

        const data = {
            upi_short_code: nanoid(5),       // code added by us
            amount: 0,   // as starting amount will be zero
            status: "ASSIGNED",
            currency: "INR",
            merchant_order_id: payInData?.merchant_order_id,  // for time being we are using this
            user_id: payInData?.user_id,
            bank_acc_id: bankAccountLinkRes?.bankAccountId,
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



    // async payInProcess(payInId, data) {

       

    //     // const matchDataFromBotRes = botResponseRepo.getBotResByUtrAndAmount(usrSubmittedUtr,amount)

    //     // if(!matchDataFromBotRes){
    //     //     const payInData = {
    //     //         amount: amount,
    //     //         usrSubmittedUtr:usrSubmittedUtr,
    //     //         is_url_expires:true
    //     //     }


    //     //     const updatePayinRes = payInRepo.updatePayInData(payInId,payInData)

    //     //     const response = {
    //     //         status: "Not Found",
    //     //         amount: amount,
    //     //         transactionId: updatePayinRes?.merchant_order_id,
    //     //         return_url:updatePayinRes?.return_url
    //     //     }

    //     //     return DefaultResponse(
    //     //         res,
    //     //         200,
    //     //         "Payment Not Found",
    //     //         response
    //     //     );
    //     // }


    //     // if (matchDataFromBotRes?.is_used === true){

    //     //     const payInData = {
    //     //         amount: amount,
    //     //         status: "DUPLICATE",
    //     //         is_notified: true,
    //     //         usrSubmittedUtr:usrSubmittedUtr,
    //     //         is_url_expires:true
    //     //     }


    //     //     const updatePayinRes = payInRepo.updatePayInData(payInId,payInData)

    //     //     const response = {
    //     //         status: "Duplicate",
    //     //         amount: amount,
    //     //         transactionId: updatePayinRes?.merchant_order_id,
    //     //         return_url:updatePayinRes?.return_url
    //     //     }

    //     //     return DefaultResponse(
    //     //         res,
    //     //         200,
    //     //         "Duplicate Payment Found",
    //     //         response
    //     //     );
    //     // }
    //     // else{
    //     //     const payInData = {
    //     //         amount: amount,
    //     //         status: "Success",
    //     //         is_notified: true,
    //     //         usrSubmittedUtr:usrSubmittedUtr,
    //     //         utr:matchDataFromBotRes?.utr,
    //     //         approved_at: new Date(),
    //     //         is_url_expires:true
    //     //     }

    //     //     const updatePayinRes = payInRepo.updatePayInData(payInId,payInData)

    //     //     const response = {
    //     //         status: "Success",
    //     //         amount: amount,
    //     //         transactionId: updatePayinRes?.merchant_order_id,
    //     //         return_url:updatePayinRes?.return_url
    //     //     }
    //     //     return DefaultResponse(
    //     //         res,
    //     //         200,
    //     //         "Payment Done successfully",
    //     //         response
    //     //     );
    //     // }
    //     const { usrSubmittedUtr, code, amount } = data;
    //     const matchDataFromBotRes = await botResponseRepo.getBotResByUtrAndAmount(usrSubmittedUtr, amount);

    //     let payInData;
    //     let responseMessage;

    //     if (!matchDataFromBotRes) {
    //         payInData = {
    //             amount,
    //             usrSubmittedUtr,
    //             is_url_expires: true
    //         };

    //         responseMessage = "Payment Not Found";
    //     } else if (matchDataFromBotRes.is_used === true) {
    //         payInData = {
    //             amount,
    //             status: "DUPLICATE",
    //             is_notified: true,
    //             usrSubmittedUtr,
    //             is_url_expires: true
    //         };

    //         responseMessage = "Duplicate Payment Found";
    //     } else {
    //         payInData = {
    //             amount,
    //             status: "Success",
    //             is_notified: true,
    //             usrSubmittedUtr,
    //             utr: matchDataFromBotRes.utr,
    //             approved_at: new Date(),
    //             is_url_expires: true
    //         };

    //         responseMessage = "Payment Done successfully";
    //     }

    //     const updatePayinRes = await payInRepo.updatePayInData(payInId, payInData);

    //     const response = {
    //         status: payInData.status || "Not Found",
    //         amount,
    //         transactionId: updatePayinRes?.merchant_order_id,
    //         return_url: updatePayinRes?.return_url
    //     };

    //     return DefaultResponse(
    //         res,
    //         200,
    //         responseMessage,
    //         response
    //     );
    // }

    // async getAllPayInData(skip, take, upiShortCode,amount,merchantOrderId, merchantCode,userId,utr, payinId,dur,status,bank,filterToday) {
    //     const now = new Date();
    //     const startOfDay = new Date(now.setHours(0, 0, 0, 0)).toISOString(); // Start of today
    //     console.log("🚀 ~ PayInService ~ getAllPayInData ~ startOfDay:", startOfDay)
    //     const endOfDay = new Date(now.setHours(23, 59, 59, 999)).toISOString(); // End of today
    //     console.log("🚀 ~ PayInService ~ getAllPayInData ~ endOfDay:", endOfDay)
    //     const filters = {
    //         ...(merchantOrderId && { merchant_order_id: { contains: merchantOrderId, mode: 'insensitive' } }),
    //         ...(utr && { utr: { contains: utr, mode: 'insensitive' } }),
    //         ...(userId && { user_id: { equals: userId } }),
    //         ...(payinId && { id: { equals: payinId } }),
    //         ...(upiShortCode && { upi_short_code: { contains: upiShortCode, mode: 'insensitive' } }),
    //         ...(amount && { amount: { equals: amount } }),
    //         ...(utr && { utr: { equals: utr } }),
    //         ...(dur && { duration: { contains: dur, mode: 'insensitive' } }),
    //         ...(status && { status: { contains: status, mode: 'insensitive' } }),
    //         ...(merchantCode && {
    //             Merchant: {
    //                 code: { contains: merchantCode, mode: 'insensitive' }
    //             }
    //         }),
    //         // ...(merchantCode && {
    //         //     Merchant: {
    //         //         code: { contains: merchantCode, mode: 'insensitive' }
    //         //     }
    //         // }),
    //         ...(filterToday && {
    //             createdAt: {
    //                 gte: startOfDay,
    //                 lte: endOfDay
    //             }
    //         }),
    //     };
    
    //     const payInData = await prisma.payin.findMany({
    //         where: filters,
    //         skip: skip,
    //         take: take,
    //         include: {
    //             Merchant: true,
                
    //         }
    //     });
    
    //     const totalRecords = await prisma.payin.count({
    //         where: filters,
    //     });
    //     const serializedPayinData = payInData.map(payInData => ({
    //         ...payInData,
    //         expirationDate: payInData.expirationDate ? payInData.expirationDate.toString() : null,
    //     }));
    //     return { payInData:serializedPayinData, totalRecords };
    // }
    

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