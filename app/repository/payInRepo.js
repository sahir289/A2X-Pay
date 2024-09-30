import { prisma } from '../client/prisma.js';

class PayInRepo {

    async generatePayInUrl(data) {
        const payInUrlRes = await prisma.payin.create({
            data: data
        })
        return payInUrlRes
    }

    async validatePayInUrl(payInId) {
        const validateUrlRes = await prisma.payin.findFirst({
            where: {
                id: payInId
            }
        })
        return validateUrlRes
    }

    async expirePayInUrl(payInId) {
        const expirePayInUrlRes = await prisma.payin.update({
            where: {
                id: payInId
            }, data: {
                is_url_expires: true,
                status: "DROPPED"
            }
        })
        return expirePayInUrlRes
    }

    async getMerchantByCodeAndApiKey(code, api_key) {

        const merchantRes = await prisma.merchant.findFirst({
            where: {
                code: code,
                api_key: api_key
            }
        })

        return merchantRes;
    }

    async getPayInData(payInId) {
        const paymentRes = await prisma.payin.findFirst({
            where: {
                id: payInId
            }
        })
        return paymentRes
    }

    async updatePayInData(payInId, data) {
        const payInUrlRes = await prisma.payin.update({
            where: {
                id: payInId
            },
            data: data
        })
        return payInUrlRes
    }

    
    async getPayInDataByUtrOrUpi(utr, upi_short_code) {
        // Construct the conditions
        let conditions = [];

        // if (utr) {
        //     conditions.push({ user_submitted_utr: utr , });
        // }
        if (utr) {
            conditions.push({
                user_submitted_utr: utr,
                status: { not: 'DUPLICATE' }
            });
        }
        if (upi_short_code !== "nill") {
            conditions.push({ upi_short_code: upi_short_code });
        }

        // If no conditions are provided, return an empty array
        if (conditions.length === 0) {
            return [];
        }

        // If both conditions are present, use AND condition
        if (conditions[0]?.user_submitted_utr && conditions[1]?.upi_short_code) {
            const payInRes = await prisma.payin.findMany({
                where: {
                    AND: [
                        { user_submitted_utr: utr },
                        { upi_short_code: upi_short_code }
                    ]
                }
            });
            return payInRes;
        } else {
            // If only one condition is present, use OR condition
            const payInRes = await prisma.payin.findMany({
                where: {
                    OR: conditions
                },
            });
            return payInRes;
        }


    }


    async getPayInDataByMerchantOrderId(merchantOrderId) {
        const payInDataRes = await prisma.payin.findFirst({
            where: {
                merchant_order_id: merchantOrderId,
            },
            include: {
                Merchant: true
            }
        })
        return payInDataRes;
    }

    async getPayinDataByUsrSubmittedUtr(usrSubmittedUtr){
        const payInRes = await prisma.payin.findMany({
            where: {
                user_submitted_utr:usrSubmittedUtr
            },
        });
        return payInRes;
    }
}

export default new PayInRepo()