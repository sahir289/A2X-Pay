import { prisma } from '../client/prisma.js';

class BotResponseRepo {
    async botResponse(data) {
        const botRes = await prisma.telegramResponse.create({
            data: data
        })
        return botRes;
    }


    async getBotData(code) {
        const botRes = await prisma.telegramResponse.findFirst({
            where: {
                amount_code: code
            }
        }
        )
        return botRes;
    }

    async updateBotResponse(amount_code) {
        const updateBotRes = await prisma.telegramResponse.update({
            where: {
                amount_code: amount_code
            }, data: {
                is_used: true
            }
        })
        return updateBotRes;
    }

    async getBotResByUtrAndAmount(usrSubmittedUtr,amount){
        const botRes = await prisma.telegramResponse.findFirst({
            where:{
                utr:usrSubmittedUtr,
                amount:amount,
            }
        })

        return botRes;
    }

    async updateBotResponseByUtrAndAmount(id,utr,amount) {
        console.log("🚀 ~ BotResponseRepo ~ updateBotResponseByUtrAndAmount ~ id:", id)
        console.log("🚀 ~ BotResponseRepo ~ updateBotResponseByUtrAndAmount ~ amount:", amount)
        console.log("🚀 ~ BotResponseRepo ~ updateBotResponseByUtrAndAmount ~ utr:", utr)
        const updateBotRes = await prisma.telegramResponse.update({
            where: {
                id:id,
                utr:utr,
                amount:amount,
            }, data: {
                is_used: true
            }
        })
        return updateBotRes;
    }

}

export default new BotResponseRepo()