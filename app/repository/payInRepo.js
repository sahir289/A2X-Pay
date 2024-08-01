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
                is_url_expires: true
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
        // Construct the OR condition based on the presence of utr and upi_short_code
        let orConditions = [];

        if (utr) {
            orConditions.push({ user_submitted_utr: utr });
        }

        if (upi_short_code) {
            orConditions.push({ upi_short_code: upi_short_code });
        }

        console.log("🚀 ~ PayInRepo ~ getPayInDataByUtrOrUpi ~ orConditions:", orConditions);

        // If no conditions are provided, return an empty array
        if (orConditions.length === 0) {
            return [];
        }

        // Perform the query with the OR condition
        const payInRes = await prisma.payin.findMany({
            where: {
                OR: orConditions
            },
        });

        return payInRes;
    }
}

export default new PayInRepo()