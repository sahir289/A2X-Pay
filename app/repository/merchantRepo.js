import { prisma } from "../client/prisma.js";
import { CustomError } from "../middlewares/errorHandler.js";
import { logger } from "../utils/logger.js";

class MerchantRepo {
  async createMerchant(data) {
    try {
      const merchant = await prisma.merchant.create({
        data: data,
      });
      return merchant;
    } catch (error) {
      logger.info('Error creating merchant:', error.message);
    }
  }

  async getMerchantByCode(code) {
    try {
      const merchantRes = await prisma.merchant.findFirst({
        where: {
          code: code,
          is_deleted: false, //get merchant records which is not deleted
        },
      });

      return merchantRes;
    } catch (error) {
      logger.info("Failed to get merchants by code", error);
    }
  }

  async getMerchantById(id) {
    try {
      const merchant = await prisma.merchant.findFirst({
        where: {
          id: id,
          is_deleted: false, // Get merchant records which are not deleted
        },
      });

      return merchant;
    } catch (error) {
      logger.info('Failed to get merchant by ID:', error.message);
    }
  }

  async getMerchantsByIds(ids) {
    try {
      const merchants = await prisma.merchant.findMany({
        where: {
          id: {
            in: ids, // Use the `in` filter for multiple IDs
          },
          is_deleted: false, // Get merchants that are not deleted
        },
      });

      return merchants;
    } catch (error) {
      logger.info('Failed to get merchants by IDs:', error.message);
    }
  }

  async getAllMerchants(query) {
    const page = parseInt(query.page) || 1;
    const pageSize = parseInt(query.pageSize) || 15;

    const skip = (page - 1) * pageSize;
    const take = pageSize;

    try {
      const merchants = await prisma.merchant.findMany({
        skip: skip,
        take: take,
        orderBy: [
          { is_deleted: 'asc' },  // First sort by 'is_deleted'
          { createdAt: 'desc' },  // Then sort by 'createdAt' descending
        ]
      });

      const totalRecords = await prisma.merchant.count({});

      return {
        merchants,
        pagination: {
          page,
          pageSize,
          total: totalRecords,
        },
        orderBy: {
          is_deleted: 'desc',
        },
      };
    } catch (error) {
      logger.info('Failed to get all merchants:', error.message);
    }
  }

  async updateMerchant(merchant_id, amount) {
    try {
      // Fetch the current balance of the merchant
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
    } catch (error) {
      logger.info('Failed to update merchant balance:', error.message);
    }
  }

  async deleteMerchant(body) {
    const { merchantId } = body;

    try {
      // Check if the merchant exists before attempting to delete
      const existingMerchant = await prisma.merchant.findUnique({
        where: { id: merchantId },
      });

      // Update the merchant's status to 'deleted'
      const merchantRes = await prisma.merchant.update({
        where: {
          id: merchantId,
        },
        data: {
          is_deleted: true,
        },
      });

      return merchantRes;
    } catch (error) {
      logger.info('Failed to delete merchant:', error.message);
    }
  }

  async updateMerchantData(data) {
    try {
      // Check if the merchant exists before updating
      const existingMerchant = await prisma.merchant.findUnique({
        where: { id: data.id },
      });

      // Update the merchant data
      const merchantRes = await prisma.merchant.update({
        where: {
          id: data.id,
        },
        data: data,
      });

      return merchantRes;
    } catch (error) {
      logger.info('Failed to update merchant data:', error.message);
    }
  }

  async getAllMerchantsData(query) {
    const page = parseInt(query.page) || 1;
    const pageSize = parseInt(query.pageSize) || 15;

    const skip = (page - 1) * pageSize;
    const take = pageSize;
    const { code } = query;

    // Apply filters dynamically
    const filters = {
      ...(code && {
        code: Array.isArray(code) ? { in: code } : code,
      }),
    };

    try {
      // Fetch merchants with pagination
      const merchants = await prisma.merchant.findMany({
        skip,
        take,
        orderBy: [
          { is_deleted: "asc" },
          { createdAt: "desc" },
        ],
        where: filters,
      });

      // Check if merchants array is empty or contains invalid data
      if (!merchants || merchants.length === 0) {
        console.error('No merchants found or data is invalid');
        return {
          transformedData: [],
          pagination: {
            page,
            pageSize,
            total: 0,
          },
        };
      }

      // Fetch related data in parallel
      const merchantCodes = merchants.map((merchant) => merchant?.code).filter(Boolean); // Filter out undefined or null codes

      if (merchantCodes.length === 0) {
        console.error('No valid merchant codes found');
        return {
          transformedData: [],
          pagination: {
            page,
            pageSize,
            total: 0,
          },
        };
      }

      const [
        payInData,
        payOutData,
        reversedPayOutData,
        settlementData,
        lienData,
      ] = await Promise.all([
        prisma.payin.findMany({
          where: {
            status: "SUCCESS",
            Merchant: { code: { in: merchantCodes } },
            approved_at: { not: null },
          },
          include: {
            Merchant: true
          }
        }),
        prisma.payout.findMany({
          where: {
            status: { in: ["SUCCESS", "REJECTED"] },
            Merchant: { code: { in: merchantCodes } },
            approved_at: { not: null },
          },
          include: {
            Merchant: true
          }
        }),
        prisma.payout.findMany({
          where: {
            status: "REJECTED",
            Merchant: { code: { in: merchantCodes } },
            approved_at: { not: null },
            rejected_at: { not: null },
          },
          include: {
            Merchant: true
          }
        }),
        prisma.settlement.findMany({
          where: {
            status: "SUCCESS",
            Merchant: { code: { in: merchantCodes } },
          },
          include: {
            Merchant: true
          }
        }),
        prisma.lien.findMany({
          where: {
            Merchant: { code: { in: merchantCodes } },
          },
          include: {
            Merchant: true
          }
        }),
      ]);

      // Group related data by merchant code
      const groupByMerchantCode = (data) =>
        data.reduce((acc, item) => {
          if (item.Merchant?.code) {
            acc[item.Merchant.code] = acc[item.Merchant.code] || [];
            acc[item.Merchant.code].push(item);
          }
          return acc;
        }, {});

      const payInDataByMerchant = groupByMerchantCode(payInData);
      const payOutDataByMerchant = groupByMerchantCode(payOutData);
      const reversedPayOutDataByMerchant = groupByMerchantCode(reversedPayOutData);
      const settlementDataByMerchant = groupByMerchantCode(settlementData);
      const lienDataByMerchant = groupByMerchantCode(lienData);

      // Transform merchant data
      const merchantData = merchants.map((merchant) => {
        if (!merchant.code) {
          console.error('Merchant code is missing:', merchant);
          return null; // Skip invalid merchant objects
        }

        const payIn = payInDataByMerchant[merchant.code] || [];
        const payOut = payOutDataByMerchant[merchant.code] || [];
        const reversedPayOut = reversedPayOutDataByMerchant[merchant.code] || [];
        const settlement = settlementDataByMerchant[merchant.code] || [];
        const lien = lienDataByMerchant[merchant.code] || [];

        const payInAmount = payIn.reduce((sum, data) => sum + Number(data.amount), 0);
        const payInCommission = payIn.reduce(
          (sum, data) => sum + Number(data.payin_commission),
          0
        );

        const payOutAmount = payOut.reduce((sum, data) => sum + Number(data.amount), 0);
        const payOutCommission = payOut.reduce(
          (sum, data) => sum + Number(data.payout_commision),
          0
        );

        const reversedPayOutAmount = reversedPayOut.reduce(
          (sum, data) => sum + Number(data.amount),
          0
        );
        const reversedPayOutCommission = reversedPayOut.reduce(
          (sum, data) => sum + Number(data.payout_commision),
          0
        );

        const settlementAmount = settlement.reduce(
          (sum, data) => sum + Number(data.amount),
          0
        );

        const lienAmount = lien.reduce((sum, data) => sum + Number(data.amount), 0);

        const balance =
          payInAmount -
          payOutAmount -
          (payInCommission + payOutCommission - reversedPayOutCommission) -
          settlementAmount -
          lienAmount +
          reversedPayOutAmount;

        return {
          ...merchant,
          balance,
        };
      }).filter(Boolean); // Remove any null values

      // Handle child data (if you have a hierarchical structure)
      const transformedData = merchantData.reduce((acc, item) => {
        if (item.child_code && item.child_code.length) {
          item.childrenData = item.child_code.map((code) =>
            merchantData.find((child) => child.code === code)
          );
        }

        if (!merchantData.some((parent) => parent.child_code?.includes(item.code))) {
          acc.push(item);
        }

        return acc;
      }, []);

      const totalRecords = await prisma.merchant.count({ where: filters });

      return {
        transformedData,
        pagination: {
          page,
          pageSize,
          total: totalRecords,
        },
      };
    } catch (error) {
      logger.info("Error fetching merchant data:", error);
    }
  }

  async updateIsMerchantAdminByCode(code) {
    try {
      // Check if the merchant exists before updating
      const existingMerchant = await prisma.merchant.findUnique({
        where: { code: code },
      });

      // Update the merchant's is_merchant_Admin field to true
      const res = await prisma.merchant.update({
        where: {
          code: code,
        },
        data: {
          is_merchant_Admin: true,
        },
      });

      return res;
    } catch (error) {
      logger.info('Failed to update merchant admin status by code:', error.message);
    }
  }

  async updateParentMerchantChildCodeById(id, childCode) {
    try {
      // Check if the merchant exists before updating
      const existingMerchant = await prisma.merchant.findUnique({
        where: { id: id },
      });

      // Update the merchant's child_code field with the new value
      const res = await prisma.merchant.update({
        where: {
          id: id,
        },
        data: {
          child_code: childCode,
        },
      });

      return res;
    } catch (error) {
      logger.info('Failed to update parent merchant child code by ID:', error.message);
    }
  }
}

export default new MerchantRepo();
