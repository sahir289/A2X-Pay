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

    async getPayInDataByUtr(utr){
        console.log("🚀 ~ PayInRepo ~ getPayInDataByUtr ~ utr:", utr)
        const payInRes = await prisma.payin.findMany({
            where:{
                user_submitted_utr:utr
            }
        })
        return payInRes
    }
}

export default new PayInRepo()