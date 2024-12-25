import { prisma } from "../client/prisma.js";
import { CustomError } from "../middlewares/errorHandler.js";
import { logger } from "../utils/logger.js";

class BankAccountRepo {
  async createBankAccount(data) {
    try {
      // Create the bank account with the provided data
      const bankAccount = await prisma.bankAccount.create({
        data: data,
      });

      return bankAccount;
    } catch (error) {
      logger.info('Failed to create bank account:', error.message);
    }
  }

  async addBankToMerchant(data) {
    try {
      // Add the bank account to the merchant
      const bankAccount = await prisma.merchant_Bank.create({
        data: data,
      });

      return bankAccount;
    } catch (error) {
      logger.info('Failed to add bank account to merchant:', error.message);
    }
  }

  async getMerchantBankById(id) {
    try {
      // Fetch the bank account details for the given merchant ID
      const bankRes = await prisma.merchant_Bank.findMany({
        where: {
          merchantId: id,
        },
        include: {
          bankAccount: true,
        },
      });

      return bankRes;
    } catch (error) {
      logger.info('Failed to get merchant bank details by ID:', error.message);
    }
  }

  //Function to get Payin banks
  async getPayinBank() {
    try {
      // Fetch the bank accounts used for "payIn"
      const bankRes = await prisma.bankAccount.findMany({
        where: {
          bank_used_for: "payIn",
        },
      });

      return bankRes;
    } catch (error) {
      logger.info('Failed to get payIn bank accounts:', error.message);
    }
  }

  //Function to get Payout banks
  async getPayoutBank(vendor_code, loggedInUserRole) {
    try {
      // Construct the filter object based on provided conditions
      const filters = {
        ...(loggedInUserRole !== "ADMIN" && vendor_code && vendor_code !== "null" && { vendor_code: vendor_code }),
        bank_used_for: "payOut",
      };

      // Fetch the bank accounts used for "payOut" based on filters
      const bankRes = await prisma.bankAccount.findMany({
        where: filters,
      });

      return bankRes;
    } catch (error) {
      logger.info('Failed to get payOut bank accounts:', error.message);
    }
  }

  async getBankAccountByCode(code) {
    try {
      // Fetch the bank account by the provided code
      const bankAccRes = await prisma.bankAccount.findFirst({
        where: {
          code: code,
        },
      });

      return bankAccRes;
    } catch (error) {
      logger.info('Failed to get bank account by code:', error.message);
    }
  }

  async updateBankAccountBalance(bankAccId, amount) {
    try {
      // Fetch the current balance for the specified bank account
      const bankAccRes = await prisma.bankAccount.findUnique({
        where: {
          id: bankAccId,
        },
        select: {
          balance: true,
        },
      });

      // Check if the bank account was found
      if (!bankAccRes) {
        throw new Error("Bank account not found");
      }

      // Ensure the balance is a number, even if it's 0
      const currentBalance = parseFloat(bankAccRes.balance) || 0;

      // Calculate the new balance
      const newBalance = currentBalance + parseFloat(amount);

      // Update the bank account with the new balance
      const updateBankAccRes = await prisma.bankAccount.update({
        where: {
          id: bankAccId,
        },
        data: {
          balance: newBalance,
        },
      });

      return updateBankAccRes;
    } catch (error) {
      logger.info('Failed to update bank account balance:', error.message);
    }
  }

  async updatePayoutBankAccountBalance(bankAccId, amount, status) {
    try {
      // Fetch the current balance for the specified bank account
      const bankAccRes = await prisma.bankAccount.findUnique({
        where: {
          id: bankAccId,
        },
        select: {
          balance: true,
        },
      });

      // Check if the bank account exists
      if (!bankAccRes) {
        throw new Error("Bank account not found");
      }

      // Ensure the balance is a number, even if it's 0
      const currentBalance = parseFloat(bankAccRes.balance) || 0;

      // Calculate the new balance based on the status
      let newBalance = 0;
      if (status === "SUCCESS") {
        newBalance = currentBalance - parseFloat(amount);
      } else if (status === "REJECTED") {
        newBalance = currentBalance + parseFloat(amount);
      }

      // Update the bank account with the new balance
      const updateBankAccRes = await prisma.bankAccount.update({
        where: {
          id: bankAccId,
        },
        data: {
          balance: newBalance,
        },
      });

      return updateBankAccRes;
    } catch (error) {
      logger.info("Failed to update payout bank account balance:", error.message);
    }
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
      logger.info("Error processing bank accounts:", error);
    }
  }

  async deleteBankFromMerchant(body) {
    const { merchantId, bankAccountId } = body;

    try {
      // If multiple merchantIds are provided
      if (Array.isArray(merchantId)) {
        // First, delete the associations of the bank account from the merchants
        const deleteMerchantBank = await prisma.merchant_Bank.deleteMany({
          where: {
            merchantId: {
              in: merchantId, // Deletes associations for all provided merchantIds
            },
            bankAccountId: bankAccountId, // Specifies which bank account to remove
          },
        });

        // Check if the bank account is associated with any other merchants
        const remainingAssociations = await prisma.merchant_Bank.count({
          where: {
            bankAccountId: bankAccountId, // Count remaining associations
          },
        });

        // If there are no remaining associations, delete the bank account
        if (remainingAssociations === 0) {
          const deleteBankAccount = await prisma.bankAccount.delete({
            where: {
              id: bankAccountId,
            },
          });
          return deleteBankAccount;
        } else {
          return deleteMerchantBank; // Return the result of deleting the merchant-bank association
        }
      } else {
        // If only a single merchantId is provided
        const deleteMerchantBank = await prisma.merchant_Bank.deleteMany({
          where: {
            merchantId: merchantId,
            bankAccountId: bankAccountId,
          },
        });

        // Check if the bank account is still associated with any merchants
        const remainingAssociations = await prisma.merchant_Bank.count({
          where: {
            bankAccountId: bankAccountId,
          },
        });

        // If there are no remaining associations, delete the bank account
        if (remainingAssociations === 0) {
          const deleteBankAccount = await prisma.bankAccount.delete({
            where: {
              id: bankAccountId,
            },
          });
          return deleteBankAccount;
        } else {
          return deleteMerchantBank; // Return the result of deleting the merchant-bank association
        }
      }
    } catch (error) {
      logger.info("Error deleting bank from merchant", error);
    }
  }

  async getBankByBankAccId(bankAccId) {
    try {
      const bankRes = await prisma.bankAccount.findUnique({
        where: {
          id: bankAccId,
        },
      });

      return bankRes;
    } catch (error) {
      logger.info("Failed to retrieve bank account by ID", error);
    }
  }

  async updateBankAccountStates(data) {
    try {
      // Update the bank account state dynamically
      const bankAccRes = await prisma.bankAccount.update({
        where: {
          id: data.id,
        },
        data: {
          [data.fieldName]: data.value,  // Dynamically set the field and value
        },
      });

      return bankAccRes;
    } catch (error) {
      logger.info("Error updating bank account state:", error);
    }
  }

  async getBankNickName(nick_name) {
    try {

      const bankRes = await prisma.bankAccount.findFirst({
        where: {
          ac_name: nick_name,
        },
      });

      return bankRes;
    } catch (error) {
      logger.info("Error fetching bank account by nickname:", error);
    }
  }

  async getBankDataByBankId(bankId) {
    try {
      const res = await prisma.bankAccount.findUnique({
        where: {
          id: bankId
        },
        include: {
          Merchant_Bank: true, // Include related merchant-bank data
        }
      });

      return res;  // Return the found bank account details
    } catch (error) {
      logger.info(`Error getting bank details by id: ${bankId}`, error);
    }
  }

  async updateBankDataDetails(data) {
    try {
      const bankRes = await prisma.bankAccount.update({
        where: {
          id: data.id,  // Ensure we are updating the correct bank account by ID
        },
        data: data,  // Update the bank account with the provided data
      });

      return bankRes;  // Return the updated bank account data
    } catch (error) {
      logger.info(`Error updating bank details for ID: ${data.id}`, error);
    }
  }
}

export default new BankAccountRepo();
