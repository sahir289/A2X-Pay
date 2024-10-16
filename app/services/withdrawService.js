import { v4 as uuidv4 } from "uuid";
import { prisma } from "../client/prisma.js";
class Withdraw {
  async createWithdraw(body) {

    return await prisma.payout.create({
      data: {
        ...body,
        merchant_order_id: body?.merchant_order_id || uuidv4(),
      },
    });
  }

  async checkPayoutStatus(payoutId, merchantCode, merchantOrderId) {
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
    sno,
    from_bank,
    commission,
    utr_id,
    acc_holder_name
  ) {
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
  }

  async updateWithdraw(id, body) {
    return await prisma.payout.update({
      where: {
        id,
      },
      data: body,
    });
  }

  // Service created to get single withdraw data by id
  async getWithdrawById(id) {
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
  }

  async getAllPayOutDataWithRange(merchantCodes, status, startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
  
    const payOutData = await prisma.payout.findMany({
      where: {
        status,
        Merchant: {
          code: {
            in: merchantCodes,
          },
        },
        updatedAt: {
          gte: start,
          lte: end,
        },
      },
      include: {
        Merchant: true,
      },
      orderBy:{
        updatedAt:"asc"
      }
    });
    return payOutData;
  }

  async updateVendorCodes(withdrawIds, vendorCode) {
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
  }
}

export default new Withdraw();
