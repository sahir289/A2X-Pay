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
        is_deleted: false, //get merchant records which is not deleted
      },
    });

    return merchantRes;
  }

  async getMerchantById(id) {
    const merchant = await prisma.merchant.findFirst({
      where: {
        id: id,
        is_deleted: false, //get merchant records which is not deleted
      },
    });
    return merchant;
  }

  async getAllMerchants(query) {
    const page = parseInt(query.page) || 1;
    const pageSize = parseInt(query.pageSize) || 15;

    const skip = (page - 1) * pageSize;
    const take = pageSize;

    const merchants = await prisma.merchant.findMany({
      skip: skip,
      take: take,
      where: {
        is_deleted: false, //get all merchant records which are not deleted
      }
    });
    const totalRecords = await prisma.merchant.count({where: {is_deleted: false}});

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

  async deleteMerchant(body) {
    const { merchantId } = body;
    const merchantRes = await prisma.merchant.update(
      {
        where: {
          id: merchantId,
        },
        data: {
          is_deleted: true,
        }
      },
    );

    return merchantRes;
  }

  async updateMerchantData(data) {
    const merchantRes = await prisma.merchant.update({
      where: {
        id: data.id,
      },
      data: data,
    });

    return merchantRes;
  }
}

export default new MerchantRepo();
