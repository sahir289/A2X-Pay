import { prisma } from "../client/prisma.js";

class BotResponseRepo {
  async botResponse(data) {
    const botRes = await prisma.telegramResponse.create({
      data: data,
    });
    return botRes;
  }

  async getBotData(code) {
    const botRes = await prisma.telegramResponse.findFirst({
      where: {
        amount_code: code,
      },
    });
    return botRes;
  }

  async updateBotResponse(amount_code) {
    const updateBotRes = await prisma.telegramResponse.update({
      where: {
        amount_code: amount_code,
      },
      data: {
        is_used: true,
      },
    });
    return updateBotRes;
  }

  async getBotResByUtr(usrSubmittedUtr) {
    const botRes = await prisma.telegramResponse.findFirst({
      where: {
        utr: usrSubmittedUtr,
      },
    });

    return botRes;
  }

  async getBotResDataByUtr(usrSubmittedUtr) {
    const botRes = await prisma.telegramResponse.findMany({
      where: {
        utr: usrSubmittedUtr,
      },
    });

    return botRes;
  }

  async updateBotResponseByUtr(id) {
    const updateBotRes = await prisma.telegramResponse.update({
      where: {
        id: id,
        // utr: utr,
      },
      data: {
        is_used: true,
      },
    });
    return updateBotRes;
  }

  async updateBotResponseToUnusedUtr(id) {
    const updateBotRes = await prisma.telegramResponse.update({
      where: {
        id: id,
        // utr: utr,
      },
      data: {
        is_used: false,
      },
    });
    return updateBotRes;
  }

  async getBotResponse(query) {
    const sno = !isNaN(Number(query.sno)) ? Number(query.sno) : 0;
    const status = query.status;
    const amount = !isNaN(Number(query.amount)) ? Number(query.amount) : 0;
    const amount_code = query.amount_code;
    const utr = query.utr;
    const bankName = query.bankName
    const page = parseInt(query.page) || 1;
    const pageSize = parseInt(query.pageSize) || 10;

    const skip = (page - 1) * pageSize;
    const take = pageSize;

    let filter = {}
    if (query.is_used) {
      const is_used = query.is_used;
      filter = {
        ...(sno > 0 && { sno: sno }),
        ...(status !== "" && { status: status }),
        ...(amount > 0 && { amount: amount }),
        ...(amount_code !== "" && {
          amount_code: { contains: amount_code, mode: "insensitive" },
        }),
        ...(utr !== "" && { utr: utr }),
        ...(bankName && { bankName: bankName }),
        ...(is_used && { is_used: is_used === 'Used' ? true : is_used === 'Unused' ? false : true }),
      };
    } else {
      filter = {
        ...(sno > 0 && { sno: sno }),
        ...(status !== "" && { status: status }),
        ...(amount > 0 && { amount: amount }),
        ...(amount_code !== "" && {
          amount_code: { contains: amount_code, mode: "insensitive" },
        }),
        ...(bankName && { bankName: bankName }),
        ...(utr !== "" && { utr: utr }),
      };
    }

    const botRes = await prisma.telegramResponse.findMany({
      where: filter,
      skip: skip,
      take: take,
      orderBy: {
        sno: "desc"
      }
    });

    const totalRecords = await prisma.telegramResponse.count({ where: filter });

    return {
      botRes,
      pagination: {
        page,
        pageSize,
        total: totalRecords,
      },
    };
  }

  async getBankDataByBankName(bankName) {
    const res = await prisma.bankAccount.findFirst({
      where: {
        ac_name: bankName,
      },
      include: {
        Merchant_Bank: true
      }
    })
    return res;
  }

  async getBankRecordsByBankName(bankName, startDate, endDate) {
    const dateFilter = {};
    if (startDate) {
      dateFilter.gte = new Date(startDate);
    }
    if (endDate) {
      let end = new Date(endDate);
      
      dateFilter.lte = end;
    }
    const res = await prisma.telegramResponse.findMany({
      where: {
        bankName: bankName,
        createdAt: dateFilter,
      }
    })
    return res;
  }

}

export default new BotResponseRepo();
