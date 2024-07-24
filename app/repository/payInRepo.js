import { prisma } from '../client/prisma.js';

class PayInRepo {

    async generatePayInUrl(data) {
        console.log("🚀 ~ PayInRepo ~ payInAssign ~ data:", data)

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
            },data:{
                is_url_expires:true
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






}

export default new PayInRepo()