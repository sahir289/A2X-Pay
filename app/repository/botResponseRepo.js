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

    async getBotResByUtr(usrSubmittedUtr){
        const botRes = await prisma.telegramResponse.findFirst({
            where:{
                utr:usrSubmittedUtr,
            }
        })

        return botRes;
    }

    async updateBotResponseByUtr(id,utr) {
       
        const updateBotRes = await prisma.telegramResponse.update({
            where: {
                id:id,
                utr:utr,
            }, data: {
                is_used: true
            }
        })
        return updateBotRes;
    }

}

export default new BotResponseRepo()