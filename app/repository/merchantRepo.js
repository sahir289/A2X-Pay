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
      // where: {
      //   is_deleted: false, //get all merchant records which are not deleted
      // }
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

  async getAllMerchantsData(query) {
    const page = parseInt(query.page) || 1;
    const pageSize = parseInt(query.pageSize) || 15;

    const skip = (page - 1) * pageSize;
    const take = pageSize;
    const { code } = query

    const filters = {
      ...(code && {
        code: Array.isArray(code)
          ? { in: code }
          : code,
      })
    }

    const merchants = await prisma.merchant.findMany({
      skip: skip,
      take: take,
      where: filters
    });
    let merchantData = [];

    for (const element of merchants) {
      element.payInData = await prisma.payin.findMany({
        where: {
          status: "SUCCESS",
          Merchant: {
            code: element?.code,
          },
        },
      });

      element.payOutData = await prisma.payout.findMany({
        where: {
          status: "SUCCESS",
          Merchant: {
            code: element?.code,
          },
        },
      });

      element.settlementData = await prisma.settlement.findMany({
        where: {
          status: "SUCCESS",
          Merchant: {
            code: element?.code,
          },
        },
      });

      merchantData.push(element);
    }

    const dataRes = merchantData?.map((record) => {
      let payInAmount = 0;
      let payInCommission = 0;
      let payInCount = 0;
      let payOutAmount = 0;
      let payOutCommission = 0;
      let payOutCount = 0;
      let settlementAmount = 0;

      // Calculate payInData totals
      record.payInData?.forEach((data) => {
        payInAmount += Number(data.amount);
        payInCommission += Number(data.payin_commission);
        payInCount += 1;
      });

      // Calculate payOutData totals
      record.payOutData?.forEach((data) => {
        payOutAmount += Number(data.amount);
        payOutCommission += Number(data.payout_commision);
        payOutCount += 1;
      });

      // Calculate settlementData total
      record.settlementData?.forEach((data) => {
        settlementAmount += Number(data.amount);
      });

      // Calculate the value (balance)
      const value = payInAmount - (payOutAmount + (payInCommission + payOutCommission)) - settlementAmount;

      // Return only the calculated balance
      // Deleting specific keys
      delete record.payInData;   // Deletes payInData key and value
      delete record.payOutData;  // Deletes payOutData key and value
      delete record.settlementData;
      return {
        ...record,// Adjust this to whatever unique identifier you have
        balance: value // Add the calculated balance
      };
    });
    const transformedData = dataRes.reduce((acc, item) => {
      // Find children based on child_code and add them to the item
      if (item.child_code && item.child_code.length) {
        item.children = item.child_code.map(code => {
          return dataRes.find(child => child.code === code);
        }).filter(child => child);
      }

      // Only push the item if it's not a child of another item
      if (!dataRes.some(parent => parent.child_code.includes(item.code))) {
        acc.push(item);
      }

      return acc;
    }, []);
    const totalRecords = await prisma.merchant.count({
      where: filters
    });



    return {
      transformedData,
      pagination: {
        page,
        pageSize,
        total: totalRecords,
      },
    };
  }

  async updateIsMerchantAdminByCode(code) {
    const res = await prisma.merchant.update({
      where: {
        code: code
      },
      data: {
        is_merchant_Admin: true
      }
    })

    return res
  }

  async updateParentMerchantChildCodeById(id, childCode) {
    const res = await prisma.merchant.update({
      where: {
        id: id
      },
      data: {
        child_code: childCode
      }
    })
    return res;
  }
}

export default new MerchantRepo();
