import { prisma } from '../client/prisma.js'

class TokenRepo {
    async createUserToken(accessToken, userId) {
        const user = await prisma.accessToken.create({
            data: {
                accessToken: accessToken,
                userId: userId
            }
        })
        return user;
    }

    async getTokenByUserId(userId) {
        const userRes = await prisma.accessToken.findFirst({
            where: {
                userId: userId
            }
        })

        return userRes;
    }

    async deleteTokenByUserId(userId) {
        const userRes = await prisma.accessToken.deleteMany({
            where: {
                userId: userId
            }
        })

        return userRes;
    }

    async updateUserToken(accessToken, userId) {
        const user = await prisma.accessToken.update({
            where: {
                id: userId
            },
            data: {
                accessToken: accessToken,
            }
        })
        return user;
    }
}

export default new TokenRepo()