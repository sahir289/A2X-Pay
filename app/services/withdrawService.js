import { v4 as uuidv4 } from "uuid";
import { prisma } from "../client/prisma.js";
class Withdraw {
  async createWithdraw(body) {
    const id = uuidv4();
    return await prisma.payout.create({
      data: {
        ...body,
        merchant_order_id: id,
      },
    });
  }

  async checkPayoutStatus(payOutId, merchantCode, merchantOrderId) {
    const data = await prisma.payout.findFirst({
      where: {
        id: payOutId,
        Merchant: {
          code: merchantCode,
        },
        merchant_order_id: merchantOrderId,
      },
      include: {
        Merchant: true,
      },
    });
    console.log(data, "data");
    if (!data) {
      return null;
    }
    const response = {
      status: data.status,
      merchant_code: data.Merchant.code,
      merchant_order_id: data.merchant_order_id,
      amount: data.amount,
      payoutId: data.id,
    };
    console.log(response, "response");
    return response;
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
    payout_commision,
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
      { col: "payout_commision", value: payout_commision },
      { col: "utr_id", value: utr_id },
      { col: "acc_holder_name", value: acc_holder_name },
      { col: "vendor_code", value: vendorCode },
    ].forEach((el) => {
      if (el.value) {
        where[el.col] = el.value;
      }
    });

    if (code) {
      where.Merchant = { code };
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
      where,
      skip,
      take,
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

  async getAllPayOutDataWithRange(merchantCode, status, startDate, endDate) {
    const payOutData = await prisma.payout.findMany({
      where: {
        status,
        Merchant: {
          code: merchantCode,
        },
        createdAt: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      },
      include: {
        Merchant: true,
      },
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
