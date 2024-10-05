import cron from "node-cron";
import { prisma } from "../client/prisma.js";
import { sendTelegramDashboardReportMessage } from "../helper/sendTelegramMessages.js";
// Schedule a task to run every hour
cron.schedule("0 * * * *", () => gatherAllData("H"));
// Schedule a task to run every day at 12 AM
cron.schedule("0 0 * * *", () => gatherAllData("N"));

// H is hour and N is night.
const gatherAllData = async (type = "N") => {
  try {
    const empty = "-- -- -- ";
    let startDate, endDate;
    if (type == "H") {
      // last hour
      const date = new Date();
      startDate = new Date(date.getTime() - 60 * 60 * 1000);
      endDate = date;
    }

    if (type == "N") {
      // last 24 hours
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

    // Map the merchant codes to their respective merchant_ids
    const merchantCodeMap = merchants.reduce((acc, merchant) => {
      acc[merchant.id] = merchant.code;
      return acc;
    }, {});

    // Map the bank names to their respective bank ids
    const bankNamesMap = banks.reduce((acc, bank) => {
      acc[bank.id] = bank.ac_name;
      return acc;
    }, {});

    const payIns = await prisma.payin.groupBy({
      by: ["merchant_id"],
      _sum: {
        amount: true,
      },
      _count: {
        id: true,
      },
      where: {
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

    let totalPayIn = 0,
      totalPayOut = 0,
      totalBankPayIn = 0;

    const formattedPayIns = payIns.map((payIn) => {
      const { merchant_id, _sum, _count } = payIn;
      totalPayIn += Number(_sum.amount);
      return `${merchantCodeMap[merchant_id] || empty}: ${formatePrice(
        _sum.amount
      )} (${_count.id})`;
    });

    const formattedPayOuts = payOuts.map((payIn) => {
      const { merchant_id, _sum, _count } = payIn;
      totalPayOut += Number(_sum.amount);
      return `${merchantCodeMap[merchant_id] || empty}: ${formatePrice(
        _sum.amount
      )} (${_count.id})`;
    });

    const formattedBankPayIns = bankPayIns.map((payIn) => {
      const { bank_acc_id, _sum, _count } = payIn;
      totalBankPayIn += Number(_sum.amount);
      return `${bankNamesMap[bank_acc_id] || empty}: ${formatePrice(
        _sum.amount
      )} (${_count.id})`;
    });

    const currentDate = new Date().toISOString().split("T")[0];
    // pay in
    console.log(`\nPayIns (${currentDate}) \n`);
    console.log(formattedPayIns.join("\n"));
    console.log(`\nTotal: ${formatePrice(totalPayIn)} \n`);
    // pay out
    console.log(`\nPayOuts (${currentDate}) \n`);
    console.log(formattedPayOuts.join("\n"));
    console.log(`\nTotal: ${formatePrice(totalPayOut)} \n`);
    // banks
    console.log(`\Bank Accounts (${currentDate}) \n`);
    console.log(formattedBankPayIns.join("\n"));
    console.log(`\nTotal: ${formatePrice(totalBankPayIn)} \n`);
    await sendTelegramDashboardReportMessage(
      "-7354795362",
      formattedPayIns, 
      formattedPayOuts,
      formattedBankPayIns,
      type === "H" ? "Hourly Report" : "Daily Report",
      startDate,
      endDate, 
      "7851580395:AAHOsYd7Js-wv9sej_JP_WP8i_qJeMjMBTc",
      merchantCodeMap,
      bankNamesMap,
      
      
);
  } catch (err) {
    console.log("========= CRON ERROR =========");
    console.error(err);
    console.log("==============================");
  }
};

gatherAllData("N");

const formatePrice = (price) => {
  return Number(price).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};
