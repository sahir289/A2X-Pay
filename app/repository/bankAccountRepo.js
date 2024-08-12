import { prisma } from "../client/prisma.js";
import { CustomError } from "../middlewares/errorHandler.js";

class BankAccountRepo {
  async createBankAccount(data) {
    const bankAccount = await prisma.bankAccount.create({
      data: data,
    });
    return bankAccount;
  }

  async addBankToMerchant(data) {
    const bankAccount = await prisma.merchant_Bank.create({
      data: data,
    });
    return bankAccount;
  }

  async getMerchantBankById(id) {
    const bankRes = await prisma.merchant_Bank.findMany({
      where: {
        merchantId: id,
      },
      include: {
        bankAccount: true,
      },
    });
    return bankRes;
  }

  async getBankAccountByCode(code) {
    const bankAccRes = await prisma.bankAccount.findFirst({
      where: {
        code: code,
      },
    });

    return bankAccRes;
  }

  async updateBankAccountBalance(bankAccId, amount) {
    const bankAccRes = await prisma.bankAccount.findUnique({
      where: {
        id: bankAccId,
      },
      select: {
        balance: true,
      },
    });

    if (!bankAccRes) {
      throw new Error("Bank not found");
    }

    // Ensure the balance is a number, even if it's 0
    const currentBalance = parseFloat(bankAccRes.balance) || 0;

    // Calculate the new balance
    const newBalance = currentBalance + parseFloat(amount);

    // Calculate the new balance
    // Update the balance with the new total
    const updateBankAccRes = await prisma.bankAccount.update({
      where: {
        id: bankAccId,
      },
      data: {
        balance: newBalance,
      },
    });

    return updateBankAccRes;
  }

  async getAllBankAccounts(query) {
    const ac_no = query.ac_no;
    const ac_name = query.ac_name;
    const upi_id = query.upi_id;
    const page = parseInt(query.page) || 1;
    const pageSize = parseInt(query.pageSize) || 10;

    const skip = (page - 1) * pageSize;
    const take = pageSize;

    const filter = {
      ...(ac_no !== "" && { ac_no: { contains: ac_no, mode: "insensitive" } }),
      ...(ac_name !== "" && {
        ac_name: { contains: ac_name, mode: "insensitive" },
      }),
      ...(upi_id !== "" && {
        upi_id: { contains: upi_id, mode: "insensitive" },
      }),
    };

    const bankAccRes = await prisma.bankAccount.findMany({
      where: filter,
      skip,
      take,
      include: {
        Merchant_Bank: {
          include: {
            merchant: true,
          },
        },
      },
    });

    const transformedBankAccRes = bankAccRes.map((bank) => {
      bank.merchants = bank.Merchant_Bank.map(
        (merchantBank) => merchantBank.merchant
      );
      delete bank.Merchant_Bank;
      return bank;
    });

    const totalRecords = await prisma.bankAccount.count({
      where: filter,
    });

    return {
      bankAccRes: transformedBankAccRes,
      pagination: {
        page: parseInt(page),
        pageSize: take,
        total: totalRecords,
      },
    };
  }

  async deleteBankFromMerchant(body) {
    const { merchantId, bankAccountId } = body;

    if (Array.isArray(merchantId)) {
      const merchantBank = await prisma.merchant_Bank.deleteMany({
        where: {
          merchantId: {
            in: merchantId,
          },
          bankAccountId: bankAccountId,
        },
      });

      const bankRes = await prisma.bankAccount.delete(
        {
          where: {
            id: bankAccountId,
          },
        },
        {
          include: {
            merchant: true,
          },
        }
      );

      return bankRes;
    } else {
      const bankRes = await prisma.merchant_Bank.deleteMany({
        where: {
          merchantId: merchantId,
          bankAccountId: bankAccountId,
        },
      });

      return bankRes;
    }
  }

  async getBankByBankAccId(bankAccId) {
    const bankRes = await prisma.bankAccount.findUnique({
      where: {
        id: bankAccId,
      },
    });
    return bankRes;
  }

  async updateBankAccountStates(data) {
    console.log(data);
    const bankAccRes = await prisma.bankAccount.update({
      where: {
        id: data.id,
      },
      data: {
        [data.fieldName]: data.value,
      },
    });

    return bankAccRes;
  }
}

export default new BankAccountRepo();
