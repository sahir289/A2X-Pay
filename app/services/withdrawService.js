import { v4 as uuidv4 } from "uuid";
import { prisma } from "../client/prisma.js";
import { logger } from "../utils/logger.js";
class Withdraw {
  async createWithdraw(body) {
    try {
      return await prisma.payout.create({
        data: {
          ...body,
          merchant_order_id: body?.merchant_order_id || uuidv4(),
        },
      });
    } catch (err) {
      logger.info("Error creating Withdraw", err);
    }
  }

  async checkPayoutStatus(payoutId, merchantCode, merchantOrderId) {
    try {
      const conditions = {
        Merchant: {
          code: merchantCode,
        },
        merchant_order_id: merchantOrderId,
      };

      if (payoutId !== null) {
        conditions.id = payoutId;
      }

      const data = await prisma.payout.findFirst({
        where: {
          id: payoutId,
          Merchant: {
            code: merchantCode
          },
          merchant_order_id: merchantOrderId,
        },
        include: {
          Merchant: true,
        },
      });
      return data;
    } catch (err) {
      logger.info("Error checking Payout Status", err);
    }
  }

  async getWithdraw(
    skip,
    take,
    id,
    code,
    vendorCode,
    status,
    amount,
    acc_no,
    merchant_order_id,
    user_id,
    method,
    sno,
    from_bank,
    commission,
    utr_id,
    acc_holder_name
  ) {
    try {
      const where = {};
      [
        { col: "id", value: id },
        { col: "status", value: status },
        { col: "amount", value: amount },
        { col: "acc_no", value: acc_no },
        { col: "merchant_order_id", value: merchant_order_id },
        { col: "user_id", value: user_id },
        { col: "sno", value: sno },
        { col: "from_bank", value: from_bank },
        { col: "payout_commision", value: commission },
        { col: "utr_id", value: utr_id },
        { col: "method", value: method },
        { col: "acc_holder_name", value: acc_holder_name },
        { col: "vendor_code", value: vendorCode },
      ].forEach((el) => {
        if (el.value) {
          where[el.col] = el.value;
        }
      });

      if (code) {
        where.Merchant = { code: { in: code.split(',') } };
      }

      const data = await prisma.payout.findMany({
        where,
        skip,
        take,
        orderBy: {
          sno: "desc",
        },
        include: {
          Merchant: {
            select: {
              id: true,
              code: true,
            },
          },
        },
      });
      const totalRecords = await prisma.payout.count({
        where
      });

      return {
        data,
        totalRecords,
      };
    } catch (error) {
      logger.info('Payout data did not fetch Successful', error);
    }
  }

  async updateWithdraw(id, body) {
    try {
      const data = await prisma.payout.update({
        where: {
          id,
        },
        data: body,
      });
      return data;
    } catch (error) {
      logger.info('Payin data did not updated', error);
    }
  }

  // Service created to get single withdraw data by id
  async getWithdrawById(id) {
    try {
      const data = await prisma.payout.findFirst({
        where: {
          id,
        },
        include: {
          Merchant: {
            select: {
              id: true,
              code: true,
            },
          },
        },
      });

      return data;
    } catch (error) {
      logger.info('PayOut data fetch Failed', error);
    }
  }

  async getAllPayOutDataWithRange(merchantCodes, status, startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    const condition = {
      Merchant: {
        code: Array.isArray(merchantCodes)
          ? { in: merchantCodes }
          : merchantCodes,
      },
      status: status,
    };

    if (status === "SUCCESS") {
      condition.approved_at = {
        gte: start,
        lte: end,
      };
    }
    if (status === "REJECTED") {
      condition.rejected_at = {
        gte: start,
        lte: end,
      };
    }
    else {
      condition.updatedAt = {
        gte: start,
        lte: end,
      };
    }

    try {
      const pageSize = 1000;
      let page = 0;
      let allPayOutData = [];

      while (true) {
        const payOutData = await prisma.payout.findMany({
          where: condition,
          skip: page * pageSize,
          take: pageSize,
          include: {
            Merchant: true,
          },
          orderBy: status === "SUCCESS"
            ? { approved_at: "asc" }
            : status === "REJECTED"
              ? { rejected_at: "asc" }
              : { updatedAt: "asc" },
        });
        if (payOutData.length === 0) {
          break;
        }
        allPayOutData = [...allPayOutData, ...payOutData];
        page++;
      }
      return allPayOutData;
    } catch (error) {
      logger.error('getting error while fetching pay in data', error);
    }
  }

  async updateVendorCodes(withdrawIds, vendorCode) {
    try {
      await prisma.payout.updateMany({
        where: {
          id: {
            in: withdrawIds,
          },
        },
        data: { vendor_code: vendorCode },
      });

      return {
        message:
          "Vendor code updated successfully for all specified withdrawal IDs",
      };
    } catch (error) {
      logger.error('Error updating Vendor Codes', error);
    }
  }
}
export default new Withdraw();
