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
      logger.info('Failed to update merchant data:', error);
    }
  }

  async getAllMerchantsData(query) {
    const page = parseInt(query.page) || 1;
    const pageSize = parseInt(query.pageSize) || 15;

    const skip = (page - 1) * pageSize;
    const take = pageSize;
    const { code } = query;

    let merchantCodes = [];

    try {

        if (code) {
          const merchant = await prisma.merchant.findUnique({
              where: { code },
          });

          if (!merchant) {
              return {
                  transformedData: [],
                  pagination: {
                      page: 1,
                      pageSize: 1,
                      total: 0,
                  },
              };
          }

          merchantCodes = [code, ...(merchant.child_code || [])];
      }

      const filters = {
        ...(merchantCodes.length > 0 && {
            code: { in: merchantCodes },
        }),
    };

        const allMerchants = await prisma.merchant.findMany({
            skip,
            take,
            orderBy: [
                { is_deleted: "asc" },
                { createdAt: "desc" },
            ],
            where: filters,
        });

        if (!allMerchants.length) {
            return {
                transformedData: [],
                pagination: {
                    page,
                    pageSize,
                    total: 0,
                },
            };
        }

        merchantCodes = allMerchants.map((merchant) => merchant.code).filter(Boolean);

        const aggregatedData = await prisma.$transaction([
            prisma.payin.groupBy({
                by: ['merchant_id'],
                where: {
                    status: "SUCCESS",
                    Merchant: { code: { in: merchantCodes } },
                    approved_at: { not: null },
                },
                _sum: { confirmed: true, payin_commission: true },
            }),
            prisma.payout.groupBy({
                by: ['merchant_id'],
                where: {
                    status: { in: ["SUCCESS", "REJECTED"] },
                    Merchant: { code: { in: merchantCodes } },
                    approved_at: { not: null },
                },
                _sum: { amount: true, payout_commision: true },
            }),
            prisma.payout.groupBy({
                by: ['merchant_id'],
                where: {
                    status: "REJECTED",
                    Merchant: { code: { in: merchantCodes } },
                    approved_at: { not: null },
                    rejected_at: { not: null },
                },
                _sum: { amount: true, payout_commision: true },
            }),
            prisma.settlement.groupBy({
                by: ['merchant_id'],
                where: {
                    status: "SUCCESS",
                    Merchant: { code: { in: merchantCodes } },
                },
                _sum: { amount: true },
            }),
            prisma.lien.groupBy({
                by: ['merchant_id'],
                where: { Merchant: { code: { in: merchantCodes } } },
                _sum: { amount: true },
            }),
        ]);

        const [payInData, payOutData, reversedPayOutData, settlementData, lienData] = aggregatedData;

        const groupByCode = (data, field) =>
            data.reduce((acc, item) => {
                acc[item.merchant_id] = item._sum?.[field] || 0;
                return acc;
            }, {});

        const payInAmountByCode = groupByCode(payInData, 'confirmed');
        const payInCommissionByCode = groupByCode(payInData, 'payin_commission');

        const payOutAmountByCode = groupByCode(payOutData, 'amount');

        const payOutCommissionByCode = groupByCode(payOutData, 'payout_commision');

        const reversedPayOutAmountByCode = groupByCode(reversedPayOutData, 'amount');
        const reversedPayOutCommissionByCode = groupByCode(reversedPayOutData, 'payout_commision');

        const settlementAmountByCode = groupByCode(settlementData, 'amount');
        const lienAmountByCode = groupByCode(lienData, 'amount');

       
        const merchantMap = allMerchants.reduce((acc, merchant) => {
            acc[merchant.code] = merchant;
            return acc;
        }, {});

        const merchantsWithoutChildren = allMerchants.filter((merchant) => {
            return !allMerchants.some((parent) => parent.child_code?.includes(merchant.code));
        });

        const merchantData = merchantsWithoutChildren.map((merchant) => {
            const code = merchant.code;
            const payInAmount = Number(payInAmountByCode[merchant.id]) || 0;
            const payInCommission = Number(payInCommissionByCode[merchant.id]) || 0;

            const payOutAmount =  Number(payOutAmountByCode[merchant.id]) || 0;
            const payOutCommission = Number(payOutCommissionByCode[merchant.id]) || 0;

            const reversedPayOutAmount = Number(reversedPayOutAmountByCode[merchant.id]) || 0;
            const reversedPayOutCommission = Number(reversedPayOutCommissionByCode[merchant.id]) || 0;

            const settlementAmount = Number(settlementAmountByCode[merchant.id]) || 0;
            const lienAmount = Number(lienAmountByCode[merchant.id]) || 0;

            const balance =
                payInAmount -
                payOutAmount -
                (payInCommission + payOutCommission - reversedPayOutCommission) -
                settlementAmount -
                lienAmount +
                reversedPayOutAmount;            

                const childrenData = merchant.child_code
                ? merchant.child_code.map((childCode) => {
                      const child = merchantMap[childCode];
                      if (!child) return null;
        
                      const childPayInAmount = Number(payInAmountByCode[child.id]) || 0;
                      const childPayInCommission = Number(payInCommissionByCode[child.id]) || 0;
        
                      const childPayOutAmount = Number(payOutAmountByCode[child.id]) || 0;
                      const childPayOutCommission = Number(payOutCommissionByCode[child.id]) || 0;
        
                      const childReversedPayOutAmount = Number(reversedPayOutAmountByCode[child.id]) || 0;
                      const childReversedPayOutCommission = Number(reversedPayOutCommissionByCode[child.id]) || 0;
        
                      const childSettlementAmount = Number(settlementAmountByCode[child.id]) || 0;
                      const childLienAmount = Number(lienAmountByCode[child.id]) || 0;
        
                      const childBalance =
                          childPayInAmount -
                          childPayOutAmount -
                          (childPayInCommission + childPayOutCommission - childReversedPayOutCommission) -
                          childSettlementAmount -
                          childLienAmount +
                          childReversedPayOutAmount;
        
                      return {
                          ...child,
                          balance: childBalance,
                      };
                  }).filter(Boolean)
                : [];

            return {
                ...merchant,
                balance,
                childrenData,
            };
        });

        const totalRecords = await prisma.merchant.count({ where: filters });

        return {
            transformedData: merchantData,
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
