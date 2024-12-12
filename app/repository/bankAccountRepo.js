import { prisma } from "../client/prisma.js";
import { CustomError } from "../middlewares/errorHandler.js";
import { logger } from "../utils/logger.js";

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

  //Function to get Payin banks
  async getPayinBank() {
    const bankRes = await prisma.bankAccount.findMany({
      where: {
        bank_used_for: "payIn",
      },
    });
    return bankRes;
  }

  //Function to get Payout banks
  async getPayoutBank( vendor_code, loggedInUserRole ) {
    const filters = {
        ...(loggedInUserRole !== "ADMIN" && vendor_code && vendor_code !== "null" && { vendor_code : vendor_code }),
        bank_used_for: "payOut",
    };
    const bankRes = await prisma.bankAccount.findMany({
      where: filters,
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

  async updatePayoutBankAccountBalance(bankAccId, amount, status) {
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
    let newBalance = 0
    if (status === "SUCCESS") {
      newBalance = currentBalance - parseFloat(amount);
    }
    else if (status === "REJECTED") {
      newBalance = currentBalance + parseFloat(amount);
    }
    else {
      newBalance = currentBalance;
    }

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
    const {
      ac_no,
      ac_name,
      upi_id,
      bank_used_for,
      code,
      role,
      vendor_code,
      startDate,
      endDate,
    } = query;
  
    const page = parseInt(query.page) || 1; // Ensure `page` is an integer
    const pageSize = parseInt(query.pageSize) || 10; // Ensure `pageSize` is an integer
    const skip = (page - 1) * pageSize;
    const take = pageSize;
  
    // Date Filter Setup
    const dateFilter = {};
    if (startDate) {
      dateFilter.gte = new Date(startDate);
    }
    if (endDate) {
      dateFilter.lte = new Date(endDate);
    }
  
    // Dynamic Filters
    const filter = {
      ...(ac_no && { ac_no: { contains: ac_no, mode: "insensitive" } }),
      ...(ac_name && { ac_name: { contains: ac_name, mode: "insensitive" } }),
      ...(upi_id && { upi_id: { contains: upi_id, mode: "insensitive" } }),
      ...(bank_used_for && { bank_used_for }),
      ...(role !== "ADMIN" && code && { code }),
      ...(vendor_code && { vendor_code }),
    };
  
    try {
      const [bankAccRes, totalRecords] = await Promise.all([
        prisma.bankAccount.findMany({
          where: filter,
          skip,
          take,
          orderBy: [
            { is_enabled: "desc" },
            { updatedAt: "desc" },
          ],
          include: {
            Merchant_Bank: {
              include: {
                merchant: true,
              },
            },
          },
        }),
        prisma.bankAccount.count({ where: filter }),
      ]);
  
      // Parallel PayIn and PayOut Data Fetch
      const bankAccResponse = await Promise.all(
        bankAccRes.map(async (bank) => {
          const transformedBank = {
            ...bank,
            merchants: bank.Merchant_Bank.map(
              (merchantBank) => merchantBank.merchant
            ),
          };
          delete transformedBank.Merchant_Bank;
  
          if (bank.bank_used_for === "payIn") {
            transformedBank.payInData = await prisma.payin.findMany({
              where: {
                status: "SUCCESS",
                bank_acc_id: bank.id,
                approved_at: dateFilter,
              },
              orderBy: { approved_at: "desc" },
            });
          } else {
            transformedBank.payOutData = await prisma.payout.findMany({
              where: {
                status: "SUCCESS",
                from_bank: bank.ac_name,
                approved_at: dateFilter,
              },
              orderBy: { approved_at: "desc" },
            });
          }
          return transformedBank;
        })
      );
  
      return {
        bankAccRes: bankAccResponse,
        pagination: {
          page: parseInt(page),
          pageSize: take,
          total: totalRecords,
        },
      };
    } catch (error) {
      console.error("Error processing bank accounts:", error);
      throw error; // Ensure errors propagate for visibility in calling functions
    }
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

  async getBankNickName(nick_name) {
    const bankRes = await prisma.bankAccount.findFirst({
      where: {
        ac_name: nick_name,
      },
    });

    return bankRes;
  }

  async getBankDataByBankId(bankId) {
    try {
      const res = await prisma.bankAccount.findUnique({
        where: {
          id: bankId
        },
        include: {
          Merchant_Bank: true
        }
      })
      return res;
      
    } catch (error) {
      logger.info("not getting bank details by id")
    }
  }

  async updateBankDataDetails(data){
    const bankRes = await prisma.bankAccount.update({
      where: {
        id: data.id
      },
      data:data
    })    
  }
}

export default new BankAccountRepo();
