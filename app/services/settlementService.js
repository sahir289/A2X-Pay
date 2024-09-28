import { prisma } from "../client/prisma.js";
class Settlement {
  async createSettlement(body) {
    return await prisma.settlement.create({
      data: body,
    });
  }

  async getSettlement(
    page,
    pageSize,
    id,
    code,
    status,
    amount,
    acc_no,
    method,
    refrence_id
  ) {
    const skip = (page - 1) * pageSize;
    const take = pageSize;

    const where = {};
    [
      { col: "id", value: id },
      { col: "status", value: status },
      { col: "amount", value: amount },
      { col: "method", value: method },
      { col: "refrence_id", value: refrence_id },
    ].forEach((el) => {
      if (el.value) {
        where[el.col] = el.value;
      }
    });

    if (code) {
      const SplitedCode = code?.split(",");
      // where.Merchant = { code };
      where.Merchant = {
        code: Array.isArray(SplitedCode) ? { in: SplitedCode } : code,
      };
    }

    const data = await prisma.settlement.findMany({
      where: {
        ...where,
        ...(acc_no && {
          OR: [
            { acc_no: { contains: acc_no, mode: "insensitive" } },
            { acc_name: { contains: acc_no, mode: "insensitive" } },
            { ifsc: { contains: acc_no, mode: "insensitive" } },
          ],
        }),
      },
      skip,
      take,
      orderBy: {
        id: "desc",
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
    const totalRecords = await prisma.settlement.count({
      where: {
        ...where,
        ...(acc_no && {
          OR: [
            { acc_no: { contains: acc_no, mode: "insensitive" } },
            { acc_name: { contains: acc_no, mode: "insensitive" } },
            { ifsc: { contains: acc_no, mode: "insensitive" } },
          ],
        }),
      },
    });

    return {
      data,
      pagination: {
        page: parseInt(page),
        pageSize,
        total: totalRecords,
      },
    };
  }

  async updateSettlement(id, body) {
    return await prisma.settlement.update({
      where: {
        id: Number(id),
      },
      data: body,
    });
  }
}

export default new Settlement();
