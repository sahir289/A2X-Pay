import { prisma } from "../client/prisma.js";
import { CustomError } from "../middlewares/errorHandler.js";

class MerchantRepo {
  async createMerchant(data) {
    const merchant = await prisma.merchant.create({
      data: data,
    });
    return merchant;
  }

  async getMerchantByCode(code) {
    const merchantRes = await prisma.merchant.findFirst({
      where: {
        code: code,
      },
    });

    return merchantRes;
  }

  async getMerchantById(id) {
    const merchant = await prisma.merchant.findFirst({
      where: {
        id: id,
      },
    });
    return merchant;
  }

  async getAllMerchants(query) {
    const page = parseInt(query.page) || 1;
    const pageSize = parseInt(query.pageSize) || 20;

    const skip = (page - 1) * pageSize;
    const take = pageSize;

    const merchants = await prisma.merchant.findMany({
      skip: skip,
      take: take,
    });
    const totalRecords = await prisma.merchant.count({});

    return {
      merchants,
      pagination: {
        page,
        pageSize,
        total: totalRecords,
      },
    };
  }

  async updateMerchant(merchant_id, amount) {
    // Fetch the current balance
    const currentMerchant = await prisma.merchant.findUnique({
      where: { id: merchant_id },
      select: { balance: true },
    });

    if (!currentMerchant) {
      throw new Error("Merchant not found");
    }

    // Ensure the balance is a number, even if it's 0
    const currentBalance = parseFloat(currentMerchant.balance) || 0;
    // Calculate the new balance
    const newBalance = currentBalance + parseFloat(amount);
    // Update the balance with the new total
    const updateMerchantRes = await prisma.merchant.update({
      where: {
        id: merchant_id,
      },
      data: {
        balance: newBalance,
      },
    });

    return updateMerchantRes;
  }
}

export default new MerchantRepo();
