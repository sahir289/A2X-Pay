import cron from "node-cron";
import { prisma } from "../client/prisma.js";
import { sendTelegramDashboardReportMessage } from "../helper/sendTelegramMessages.js";
import config from "../../config.js";

// Schedule task to run daily at 12 AM IST for the previous day's data
// Schedule a task to run every hour
cron.schedule("0 * * * *", () => gatherAllData("H"));
// Schedule a task to run every day at 12 AM
cron.schedule("0 0 * * *", () => gatherAllData("N"));

// H is hour and N is night (previous day).
const gatherAllData = async (type = "N") => {
  try {
    const empty = "-- -- -- ";
    let startDate, endDate;
    if (type == "H") {
      const date = new Date();
      startDate = new Date(date.getTime() - 60 * 60 * 1000);
      endDate = date;
    }

    if (type == "N") {
      endDate = new Date();
      startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000);
    }

    const merchants = await prisma.merchant.findMany({
      select: {
        id: true,
        code: true,
      },
    });

    const banks = await prisma.bankAccount.findMany({
      select: {
        id: true,
        ac_name: true,
      },
    });

    const merchantCodeMap = merchants.reduce((acc, merchant) => {
      acc[merchant.id] = merchant.code;
      return acc;
    }, {});

    const bankNamesMap = banks.reduce((acc, bank) => {
      acc[bank.id] = bank.ac_name;
      return acc;
    }, {});

    // Only fetch successful pay-ins
    const payIns = await prisma.payin.groupBy({
      by: ["merchant_id"],
      _sum: {
        amount: true,
      },
      _count: {
        id: true,
      },
      where: {
        status: "SUCCESS", 
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });
    const payOuts = await prisma.payout.groupBy({
      by: ["merchant_id"],
      _sum: {
        amount: true,
      },
      _count: {
        id: true,
      },
      where: {
        status: "SUCCESS", 
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const bankPayIns = await prisma.payin.groupBy({
      by: ["bank_acc_id"],
      _sum: {
        amount: true,
      },
      _count: {
        id: true,
      },
      where: {
        status: "SUCCESS", 
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });
    const bankPayOuts = await prisma.payout.groupBy({
      by: ['from_bank'],
      _sum: {
        amount: true,
      },
      _count: {
        id: true,
      },
      where: {
        status: "SUCCESS",
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });    

    const formattedPayIns = payIns
      .map((payIn) => {
        const { merchant_id, _sum, _count } = payIn;
        const merchantCode = merchantCodeMap[merchant_id];
        if (merchantCode && _sum.amount > 0) {
          return `${merchantCode}: ${formatePrice(_sum.amount)} (${_count.id})`;
        }
        return null;
      })
      .filter(Boolean);

    const formattedPayOuts = payOuts
      .map((payOut) => {
        const { merchant_id, _sum, _count } = payOut;
        const merchantCode = merchantCodeMap[merchant_id];
        if (merchantCode) {
          return `${merchantCode}: ${formatePrice(_sum.amount)} (${_count.id})`;
        }
        return null;
      })
      .filter(Boolean);
    
    const formattedBankPayIns = bankPayIns
      .map((payIn) => {
        const { bank_acc_id, _sum, _count } = payIn;
        const bankName = bankNamesMap[bank_acc_id];
        if (bankName) {
          return `${bankName}: ${formatePrice(_sum.amount)} (${_count.id})`;
        }
        return null;
      })
      .filter(Boolean);

      const formattedBankPayOuts = bankPayOuts
      .map((payOut) => {
        const { from_bank, _sum, _count } = payOut;
        if (from_bank) {
          return `${from_bank}: ${formatePrice(_sum.amount)} (${_count.id})`;
        }
        return null;
      })
      .filter(Boolean);

    const currentDate = new Date().toISOString().split("T")[0];
    // // Pay In
    // console.log(`\nPayIns (${currentDate}) \n`);
    // console.log(formattedPayIns.join("\n"));
    // // Pay Out
    // console.log(`\nPayOuts (${currentDate}) \n`);
    // console.log(formattedPayOuts.join("\n"));
    // // Bank Accounts
    // console.log(`\nBank Accounts (${currentDate}) \n`);
    // console.log(formattedBankPayIns.join("\n"));

    // console.log(`\nBank Accounts PayOut(${currentDate}) \n`);
    // console.log(formattedBankPayOuts.join("\n"));

    await sendTelegramDashboardReportMessage(
      config?.telegramDashboardChatId,      
      formattedPayIns,
      formattedPayOuts,
      formattedBankPayIns,
      formattedBankPayOuts,
      type === "H" ? "Hourly Report" : "Daily Report",
      config?.telegramBotToken,

    );
  } catch (err) {
    console.log("========= CRON ERROR =========");
    console.error(err);
    console.log("==============================");
  }
};
// gatherAllData("H");
// gatherAllData("N");
const formatePrice = (price) => {
  return Number(price).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};
