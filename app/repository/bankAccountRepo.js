import { prisma } from '../client/prisma.js'
import { CustomError } from '../middlewares/errorHandler.js';

class BankAccountRepo {
    async createBankAccount(data) {
        const bankAccount = await prisma.bankAccount.create({
            data: data
        })
        return bankAccount;
    }

    async addBankToMerchant(data) {
        const bankAccount = await prisma.merchant_Bank.create({
            data: data
        })
        return bankAccount;
    }

    async getMerchantBankById(id) {
        const bankRes = await prisma.merchant_Bank.findFirst({
            where: {
                merchantId: id
            },
            include: {
                bankAccount:true

            }
        })
        return bankRes;
    }

    async getBankAccountByCode(code) {
        const bankAccRes = await prisma.bankAccount.findFirst({
            where: {
                code: code
            }
        })

        return bankAccRes;
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

    // async getAllMerchants(skip, take) {
    //     const merchants = await prisma.merchant.findMany({
    //         // where: {
    //         //     fullName: {
    //         //         contains: fullName,
    //         //         mode: 'insensitive'
    //         //     },
    //         //     userName: {
    //         //         contains: userName,
    //         //         mode: 'insensitive'
    //         //     },
    //         //     role: {
    //         //         equals: role,
    //         //     }
    //         // },
    //         skip: skip,
    //         take: take
    //     })
    //     const totalRecords = await prisma.merchant.count({
    //         // where: {
    //         //     fullName: {
    //         //         contains: fullName,
    //         //         mode: 'insensitive',
    //         //     },
    //         //     userName: {
    //         //         contains: userName,
    //         //         mode: 'insensitive',
    //         //     },
    //         //     role: {
    //         //         equals: role,
    //         //     },
    //         // },
    //     });
    //     return { merchants, totalRecords }
    // }

}

export default new BankAccountRepo()