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
        const bankRes = await prisma.merchant_Bank.findMany({
            where: {
                merchantId: id
            },
            include: {
                bankAccount: true
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

    async updateBankAccountBalance(bankAccId, amount) {
        const bankAccRes = await prisma.bankAccount.findUnique({
            where: {
                id: bankAccId
            },
            select: {
                balance: true
            }
        })

        if (!bankAccRes) {
            throw new Error('Bank not found');
        }

        // Ensure the balance is a number, even if it's 0
        const currentBalance = parseFloat(bankAccRes.balance) || 0;

        // Calculate the new balance
        const newBalance = currentBalance + parseFloat(amount);

        // Calculate the new balance
      
        console.log("🚀 ~ BankAccountRepo ~ updateBankAccountBalance ~ newBalance:", newBalance)

        // Update the balance with the new total
        const updateBankAccRes = await prisma.bankAccount.update({
            where: {
                id: bankAccId
            },
            data: {
                balance: newBalance
            }
        });

        return updateBankAccRes;

    }

    async getBankByBankAccId(bankAccId) {
        const bankRes = await prisma.bankAccount.findUnique({
            where: {
                id: bankAccId
            },
        
        })
        console.log("🚀 ~ BankAccountRepo ~ getBankByBankAccId ~ bankRes:", bankRes)
        return bankRes;
    }

}

export default new BankAccountRepo()