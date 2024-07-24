import { prisma } from '../client/prisma.js'
import { CustomError } from '../middlewares/errorHandler.js';

class MerchantRepo {
    async createMerchant(data) {
        const merchant = await prisma.merchant.create({
            data: data
        })
        return merchant;
    }

    async getMerchantByCode(code) {
        const merchantRes = await prisma.merchant.findFirst({
            where: {
                code: code
            }
        })

        return merchantRes;
    }

   

    // async updateLastLoginByUserId(userId) {
    //     const userRes = await prisma.user.update({
    //         where: {
    //             id: userId
    //         },
    //         data: {
    //             last_login: new Date()
    //         }
    //     })

    //     return userRes;
    // }

    // async validateUserId(userId) {
    //     const user = await prisma.user.findFirst({
    //         where: {
    //             id: userId
    //         }
    //     })
    //     if (!user) {
    //         throw new CustomError("Invalid user id", 404)
    //     }
    // }

    async getAllMerchants(skip, take) {
        const merchants = await prisma.merchant.findMany({
            // where: {
            //     fullName: {
            //         contains: fullName,
            //         mode: 'insensitive'
            //     },
            //     userName: {
            //         contains: userName,
            //         mode: 'insensitive'
            //     },
            //     role: {
            //         equals: role,
            //     }
            // },
            skip: skip,
            take: take
        })
        const totalRecords = await prisma.merchant.count({
            // where: {
            //     fullName: {
            //         contains: fullName,
            //         mode: 'insensitive',
            //     },
            //     userName: {
            //         contains: userName,
            //         mode: 'insensitive',
            //     },
            //     role: {
            //         equals: role,
            //     },
            // },
        });
        return { merchants, totalRecords }
    }


}

export default new MerchantRepo()