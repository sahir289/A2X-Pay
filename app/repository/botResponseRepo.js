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

  async updateBotResponseByUtr(id, utr) {
    const updateBotRes = await prisma.telegramResponse.update({
      where: {
        id: id,
        utr: utr,
      },
      data: {
        is_used: true,
      },
    });
    return updateBotRes;
  }

  async getBotResponse(query) {
    const status = query.status;
    const amount = query.amount;
    const amount_code = query.amount_code;
    const utr = query.utr;
    const page = parseInt(query.page) || 1;
    const pageSize = parseInt(query.pageSize) || 10;

    const skip = (page - 1) * pageSize;
    const take = pageSize;

    const filter = {
      ...(status !== "" && { status: status }),
      ...(amount !== "" && { amount: amount }),
      ...(amount_code !== "" && { amount_code: amount_code }),
      ...(utr !== "" && { utr: utr }),
    };

    const botRes = await prisma.telegramResponse.findMany({
      where: filter,
      skip: skip,
      take: take,
    });

    const totalRecords = await prisma.telegramResponse.count();

    return {
      botRes,
      pagination: {
        page,
        pageSize,
        total: totalRecords,
      },
    };
  }
}

export default new BotResponseRepo();
