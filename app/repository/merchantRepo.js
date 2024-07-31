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

    async updateMerchant(merchant_id, amount) {
        // Fetch the current balance
        const currentMerchant = await prisma.merchant.findUnique({
            where: { id: merchant_id },
            select: { balance: true }
        });

        if (!currentMerchant) {
            throw new Error('Merchant not found');
        }

        // Ensure the balance is a number, even if it's 0
        const currentBalance = parseFloat(currentMerchant.balance) || 0;
        console.log("🚀 ~ MerchantRepo ~ updateMerchant ~ currentBalance:", currentBalance)

        // Calculate the new balance
        const newBalance = currentBalance + parseFloat(amount);
        console.log("🚀 ~ MerchantRepo ~ updateMerchant ~ newBalance:", newBalance)

        // Update the balance with the new total
        const updateMerchantRes = await prisma.merchant.update({
            where: {
                id: merchant_id
            },
            data: {
                balance: newBalance
            }
        });

        return updateMerchantRes;
    }

}

export default new MerchantRepo()