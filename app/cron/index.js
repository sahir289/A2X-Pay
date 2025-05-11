import cron from "node-cron";
import { prisma } from "../client/prisma.js";
import { sendTelegramDashboardMerchantGroupingReportMessage, sendTelegramDashboardReportMessage, sendTelegramDashboardSuccessRatioMessage } from "../helper/sendTelegramMessages.js";
import config from "../../config.js";
import moment from "moment-timezone";

// Schedule the daily task at 12:00 AM IST (midnight)
cron.schedule("0 0 * * *", () => {
  gatherAllData("N", "Asia/Kolkata");
});

// Schedule the hourly task at every hour from 1:00 AM to 11:59 PM IST
cron.schedule("0 1-23 * * *", () => {
  gatherAllData("H", "Asia/Kolkata");
});

cron.schedule("*/5 * * * *", () => {
  formattedSuccessRatiosByMerchant("Asia/Kolkata");
});

const gatherAllData = async (type = "N", timezone = "Asia/Kolkata") => {
  try {
    const empty = "-- -- -- ";
    let startDate,
      endDate,
      oneHourAgo,
      successRatioPercentage,
      hourlySuccessRatioPercentage;
    let totalDepositAmount = 0;
    let totalWithdrawAmount = 0;
    let totalBankDepositAmount = 0;
    let totalBankWithdrawAmount = 0;

    if (typeof timezone !== "string") {
      timezone = "Asia/Kolkata";
    }

    const currentDate = moment().tz(timezone, true);

    if (type === "H") {
      // Hourly Report: Start at 12 AM today, end at the current hour today
      startDate = currentDate.clone().startOf("day").toDate(); // Start of today at 12 AM
      endDate = currentDate.clone().toDate(); // Current time

      // Calculate one hour date for hourly success ratio
      oneHourAgo = currentDate.clone().subtract(1, "hour").toDate();
    }

    if (type === "N") {
      // Daily Report: Start at 12 AM yesterday, end at 11:59 PM yesterday
      startDate = currentDate
        .clone()
        .subtract(1, "day")
        .startOf("day")
        .toDate(); // Start of yesterday
      endDate = currentDate.clone().subtract(1, "day").endOf("day").toDate(); // End of yesterday at 11:59 PM
    }

    const merchants = await prisma.merchant.findMany({
      select: { id: true, code: true, child_code: true },
    });

    const banks = await prisma.bankAccount.findMany({
      select: { id: true, ac_name: true },
    });

    const merchantCodeMap = merchants.reduce((acc, merchant) => {
      acc[merchant.id] = merchant.code;    
      return acc;
    }, {});

    const bankNamesMap = banks.reduce((acc, bank) => {
      acc[bank.id] = bank.ac_name;
      return acc;
    }, {});

    // fetch successful pay-ins
    const payIns = await prisma.payin.groupBy({
      by: ["merchant_id"],
      _sum: { amount: true },
      _count: { id: true },
      where: {
        status: "SUCCESS",
        approved_at: { gte: startDate, lte: endDate },
      },
    });


    totalDepositAmount = payIns.reduce(
      (sum, payIn) => sum + parseFloat(payIn._sum.amount || 0),
      0
    );

    const totalPayinTransactions = await prisma.payin.groupBy({
      by: ["merchant_id"],
      _count: { id: true },
      where: {
        updatedAt: { gte: startDate, lte: endDate },
      },
    });

    const totalTransactionsMap = totalPayinTransactions.reduce((map, item) => {
      map[item.merchant_id] = item._count.id || 0;
      return map;
    }, {});

    const hourlyPayinTransactions = await prisma.payin.groupBy({
      by: ["merchant_id", "status"],
      _count: { id: true },
      where: {
        updatedAt: { gte: oneHourAgo, lte: endDate },
      },
    });

    const hourlyTransactionsMap = hourlyPayinTransactions.reduce((map, item) => {
      const merchantId = item.merchant_id;
      const status = item.status;
      
      if (!map[merchantId]) {
        map[merchantId] = { total: 0, success: 0 };
      }
    
      map[merchantId].total += item._count.id; // increment total transactions
      if (status === "SUCCESS") {
        map[merchantId].success += item._count.id; // increment transactions
      }
    
      return map;
    }, {});

    const payOuts = await prisma.payout.groupBy({
      by: ["merchant_id"],
      _sum: { amount: true },
      _count: { id: true },
      where: {
        status: "SUCCESS",
        updatedAt: { gte: startDate, lte: endDate },
      },
    });

    totalWithdrawAmount = payOuts.reduce(
      (sum, payOut) => sum + parseFloat(payOut._sum.amount || 0),
      0
    );

    const bankPayIns = await prisma.telegramResponse.groupBy({
      by: ["bankName"],
      _sum: { amount: true },
      _count: { id: true },
      where: {
        status: "/success",
        createdAt: { gte: startDate, lte: endDate },
      },
    });

    totalBankDepositAmount = bankPayIns.reduce(
      (sum, payIn) => sum + parseFloat(payIn._sum.amount || 0),
      0
    );

    const bankPayOuts = await prisma.payout.groupBy({
      by: ["from_bank"],
      _sum: { amount: true },
      _count: { id: true },
      where: {
        approved_at: { gte: startDate, lte: endDate },
      },
    });

    totalBankWithdrawAmount = bankPayOuts.reduce(
      (sum, payOut) => sum + parseFloat(payOut._sum.amount || 0),
      0
    );

    // format payins of merchants independently
    const formattedPayIns = payIns
      .map((payIn) => {
        const { merchant_id, _sum, _count } = payIn;
        const merchantCode = merchantCodeMap[merchant_id];
        return merchantCode && _sum.amount > 0
          ? `${merchantCode}: ${formatePrice(_sum.amount)} (${_count.id})`
          : null;
      })
      .filter(Boolean);

      // here we are grouping merchants with their child
      const childToParentPayinMap = {};
      const parentToChildrenPayinMap = {};
      
      merchants.forEach((merchant) => {
        const { code, child_code } = merchant;
        if (child_code) {
          child_code.forEach((child) => {
            childToParentPayinMap[child] = code;
          });
        }
        parentToChildrenPayinMap[code] = child_code || [];
      });

      const merchantPayinAggregates = {};

      payIns.forEach(({ merchant_id, _sum, _count }) => {
        const merchant = merchants.find((m) => m.id === merchant_id);
        if (merchant) {
          const code = merchant.code;
          const parentCode = childToParentPayinMap[code] || code;
      
          // initialize aggregation for the parent merchant if it is not done already
          if (!merchantPayinAggregates[parentCode]) {
            merchantPayinAggregates[parentCode] = { amount: 0, count: 0 };
          }

          // add amount to the parent merchant aggregation
          merchantPayinAggregates[parentCode].amount += Number(_sum.amount) || 0;
          merchantPayinAggregates[parentCode].count += Number(_count.id) || 0;
        }
      });

      // format payins with merchants grouping
      const formattedMerchantGroupingPayIns = [];
      Object.keys(parentToChildrenPayinMap).forEach((parentCode) => {
        if (merchantPayinAggregates[parentCode]) {
          const { amount, count } = merchantPayinAggregates[parentCode];
          if (amount > 0) {
            formattedMerchantGroupingPayIns.push(`${parentCode}: ${formatePrice(amount)} (${count})`);
          }
        }
      });

    const formattedRatios = payIns
      .map((payIn) => {
        const { merchant_id, _sum, _count } = payIn;
        const merchantCode = merchantCodeMap[merchant_id];

        // total transactions
        const totalTransactions = totalTransactionsMap[merchant_id] || 0;
        const successRatioPercentage =
          totalTransactions === 0
            ? "0%"
            : Math.min(((_count.id / totalTransactions) * 100).toFixed(2), 100) + "%";

        // hourly transactions
        const hourlyTransactions = hourlyTransactionsMap[merchant_id] || { total: 0, success: 0 };
        const hourlySuccessRatioPercentage =
          hourlyTransactions.total === 0
            ? "0%"
            : Math.min(((hourlyTransactions.success / hourlyTransactions.total) * 100).toFixed(2), 100) + "%";

        return merchantCode && _sum.amount > 0
          ? `${merchantCode}: Total: ${successRatioPercentage} - Hourly: ${hourlySuccessRatioPercentage}`
          : null;
      })
      .filter(Boolean);

      const formattedSuccessRatiosByMerchant = async () => {
        try {
          const now = new Date();
          const intervals = [
            { label: "Last 5m", duration: 5 * 60 * 1000 },
            { label: "Last 15m", duration: 15 * 60 * 1000 },
            { label: "Last 30m", duration: 30 * 60 * 1000 },
            { label: "Last 1h", duration: 60 * 60 * 1000 },
            { label: "Last 3h", duration: 3 * 60 * 60 * 1000 },
            { label: "Last 24h", duration: 24 * 60 * 60 * 1000 },
          ];
      
          const allPayins = await prisma.payin.findMany({
            where: { updatedAt: { gte: startDate } },
            select: {
              merchant_id: true,
              updatedAt: true,
              status: true,
              user_submitted_utr: true,
            },
          });
      
          const transactionsByMerchant = allPayins.reduce((map, payin) => {
            if (!map[payin.merchant_id]) map[payin.merchant_id] = [];
            map[payin.merchant_id].push({
              updatedAt: new Date(payin.updatedAt),
              status: payin.status,
              user_submitted_utr: payin.user_submitted_utr,
            });
            return map;
          }, {});
      
          const merchantsWithTransactions = merchants.filter(
            (merchant) => transactionsByMerchant[merchant.id]
          );      
          let payinSuccessMsg = "Payin SR:\n";
          let utrSubmissionMsg = "UTR SR:\n";

          const noTransactions = merchantsWithTransactions.every(m => m.child_code.length === 0);

          if (merchantsWithTransactions.length === 0 && noTransactions) {
            payinSuccessMsg = `🔔 No Deposit For This Hour`;
            utrSubmissionMsg = `🔔 No UTR Submission Ratio For This Hour`;
          }
          for (const merchant of merchantsWithTransactions) {
            const merchantTransactions = transactionsByMerchant[merchant.id];
      
            const intervalDetails = intervals
              .map(({ label, duration }) => {
                const startTime = new Date(now - duration);
                const filteredTransactions = merchantTransactions.filter(
                  (tx) => tx.updatedAt >= startTime
                );
      
                const total = filteredTransactions.length;
                const success = filteredTransactions.filter(
                  (tx) => tx.status === "SUCCESS"
                ).length;
      
                const successRatio =
                  total === 0
                    ? "0.00%"
                    : Math.min(((success / total) * 100).toFixed(2), 100) + "%";
                const statusIcon = success === 0 ? "⚠️" : "✅";
      
                return `${statusIcon} ${label}: ${success}/${total} = ${successRatio}`;
              })
              .join("\n");
      
            const intervalDetailsUtr = intervals
              .map(({ label, duration }) => {
                const startTime = new Date(now - duration);
                const filteredTransactions = merchantTransactions.filter(
                  (tx) => tx.updatedAt >= startTime
                );
      
                const total = filteredTransactions.length;
                const utrSubmission = filteredTransactions.filter(
                  (tx) => tx.user_submitted_utr && tx.user_submitted_utr.length > 0
                ).length;
      
                const statusIcon = utrSubmission === 0 ? "⚠️" : "✅";
                const utrSubmissionRatio =
                  total === 0
                    ? "0.00%"
                    : Math.min(((utrSubmission / total) * 100).toFixed(2), 100) + "%";
      
                return `${statusIcon} ${label}: ${utrSubmission}/${total} = ${utrSubmissionRatio}`;
              })
              .join("\n");
      
            payinSuccessMsg += `🔔${merchant.code} - SR 🔔\n${intervalDetails}\n\n`;
            utrSubmissionMsg += `🔔${merchant.code} - SR 🔔\n${intervalDetailsUtr}\n\n`;
          }
      
          await sendTelegramDashboardSuccessRatioMessage(
            config?.telegramRatioAlertsChatId,
            payinSuccessMsg,
            config?.telegramBotToken
          );
      
          await sendTelegramDashboardSuccessRatioMessage(
            config?.telegramRatioAlertsChatId,
            utrSubmissionMsg,
            config?.telegramBotToken
          );
        } catch (error) {
          console.error("Error calculating interval success ratios:", error.message);
        }
      };     
      
      formattedSuccessRatiosByMerchant();

  // format payins of merchants independently
    const formattedPayOuts = payOuts
      .map((payOut) => {
        const { merchant_id, _sum, _count } = payOut;
        const merchantCode = merchantCodeMap[merchant_id];
        return merchantCode
          ? `${merchantCode}: ${formatePrice(_sum.amount)} (${_count.id})`
          : null;
      })
      .filter(Boolean);

    // here we are grouping merchants with their child
      const childToParentPayoutMap = {};
      const parentToChildrenPayoutMap = {};
      
      merchants.forEach((merchant) => {
        const { code, child_code } = merchant;
        if (child_code) {
          child_code.forEach((child) => {
            childToParentPayoutMap[child] = code;
          });
        }
        parentToChildrenPayoutMap[code] = child_code || [];
      });

      const merchantPayoutAggregates = {};

      payOuts.forEach(({ merchant_id, _sum, _count }) => {
        const merchant = merchants.find((m) => m.id === merchant_id);
        if (merchant) {
          const code = merchant.code;
          const parentCode = childToParentPayoutMap[code] || code;
      
          // initialize aggregation for the parent merchant if it is not already done
          if (!merchantPayoutAggregates[parentCode]) {
            merchantPayoutAggregates[parentCode] = { amount: 0, count: 0 };
          }

          // add amount to the parent merchant aggregation
          merchantPayoutAggregates[parentCode].amount += Number(_sum.amount) || 0;
          merchantPayoutAggregates[parentCode].count += Number(_count.id) || 0;
        }
      });

      // format payOuts with merchants grouping
      const formattedMerchantGroupingPayOuts = [];
      Object.keys(parentToChildrenPayoutMap).forEach((parentCode) => {
        if (merchantPayoutAggregates[parentCode]) {
          const { amount, count } = merchantPayoutAggregates[parentCode];
          if (amount > 0) {
            formattedMerchantGroupingPayOuts.push(`${parentCode}: ${formatePrice(amount)} (${count})`);
          }
        }
      });

    const formattedBankPayIns = bankPayIns
      .map((payIn) => {
        const { bankName, _sum, _count } = payIn;
        return bankName
          ? `${bankName}: ${formatePrice(_sum.amount)} (${_count.id})`
          : null;
      })
      .filter(Boolean);

    const formattedBankPayOuts = bankPayOuts
      .map((payOut) => {
        const { from_bank, _sum, _count } = payOut;
        return from_bank
          ? `${from_bank}: ${formatePrice(_sum.amount)} (${_count.id})`
          : null;
      })
      .filter(Boolean);

    await sendTelegramDashboardReportMessage(
      config?.telegramDashboardChatId,
      formattedPayIns,
      formattedPayOuts,
      formattedBankPayIns,
      formattedBankPayOuts,
      type === "H" ? "Hourly Report" : "Daily Report",
      config?.telegramBotToken,
      formatePrice(totalDepositAmount),
      formatePrice(totalWithdrawAmount),
      formatePrice(totalBankDepositAmount),
      formatePrice(totalBankWithdrawAmount),
      // formattedRatios
    );

    await sendTelegramDashboardMerchantGroupingReportMessage(
      config?.telegramDashboardMerchantGroupingChatId,
      formattedMerchantGroupingPayIns,
      formattedMerchantGroupingPayOuts,
      formattedBankPayIns,
      formattedBankPayOuts,
      type === "H" ? "Hourly Report" : "Daily Report",
      config?.telegramBotToken,
      formatePrice(totalDepositAmount),
      formatePrice(totalWithdrawAmount),
      formatePrice(totalBankDepositAmount),
      formatePrice(totalBankWithdrawAmount),
      // formattedRatios
    );
  } catch (err) {
    console.error("========= CRON ERROR =========", err);
  }
};

const empty = "-- -- -- ";
const timezone = "Asia/Kolkata";
const type = "H";
    let startDate,
      endDate,
      oneHourAgo,
      successRatioPercentage,
      hourlySuccessRatioPercentage;
    let totalDepositAmount = 0;
    let totalWithdrawAmount = 0;
    let totalBankDepositAmount = 0;
    let totalBankWithdrawAmount = 0;

    if (typeof timezone !== "string") {
      timezone = "Asia/Kolkata";
    }

    const currentDate = moment().tz(timezone, true);

    if (type === "H") {
      // Hourly Report: Start at 12 AM today, end at the current hour today
      startDate = currentDate.clone().startOf("day").toDate(); // Start of today at 12 AM
      endDate = currentDate.clone().toDate(); // Current time

      // Calculate one hour date for hourly success ratio
      oneHourAgo = currentDate.clone().subtract(1, "hour").toDate();
    }

    if (type === "N") {
      // Daily Report: Start at 12 AM yesterday, end at 11:59 PM yesterday
      startDate = currentDate
        .clone()
        .subtract(1, "day")
        .startOf("day")
        .toDate(); // Start of yesterday
      endDate = currentDate.clone().subtract(1, "day").endOf("day").toDate(); // End of yesterday at 11:59 PM
    }

const merchants = await prisma.merchant.findMany({
  select: { id: true, code: true, child_code: true },
});

const formattedSuccessRatiosByMerchant = async () => {
  try {
    const now = new Date();
    const intervals = [
      { label: "Last 5m", duration: 5 * 60 * 1000 },
      // { label: "Last 15m", duration: 15 * 60 * 1000 },
      // { label: "Last 30m", duration: 30 * 60 * 1000 },
      // { label: "Last 1h", duration: 60 * 60 * 1000 },
      // { label: "Last 3h", duration: 3 * 60 * 60 * 1000 },
      // { label: "Last 24h", duration: 24 * 60 * 60 * 1000 },
    ];

    const allPayins = await prisma.payin.findMany({
      where: { updatedAt: { gte: startDate } },
      select: {
        merchant_id: true,
        updatedAt: true,
        status: true,
        user_submitted_utr: true,
      },
    });

    const transactionsByMerchant = allPayins.reduce((map, payin) => {
      if (!map[payin.merchant_id]) map[payin.merchant_id] = [];
      map[payin.merchant_id].push({
        updatedAt: new Date(payin.updatedAt),
        status: payin.status,
        user_submitted_utr: payin.user_submitted_utr,
      });
      return map;
    }, {});

    const merchantsWithTransactions = merchants.filter(
      (merchant) => transactionsByMerchant[merchant.id]
    );      
    let payinSuccessMsg = "Payin SR:\n";
    let utrSubmissionMsg = "UTR SR:\n";

    const noTransactions = merchantsWithTransactions.every(m => m.child_code.length === 0);

    if (merchantsWithTransactions.length === 0 && noTransactions) {
      payinSuccessMsg = `🔔 No Deposit For This Hour`;
      utrSubmissionMsg = `🔔 No UTR Submission Ratio For This Hour`;
    }
    for (const merchant of merchantsWithTransactions) {
      const merchantTransactions = transactionsByMerchant[merchant.id];

      const intervalDetails = intervals
        .map(({ label, duration }) => {
          const startTime = new Date(now - duration);
          const filteredTransactions = merchantTransactions.filter(
            (tx) => tx.updatedAt >= startTime
          );

          const total = filteredTransactions.length;
          const success = filteredTransactions.filter(
            (tx) => tx.status === "SUCCESS"
          ).length;

          const successRatio =
            total === 0
              ? "0.00%"
              : Math.min(((success / total) * 100).toFixed(2), 100) + "%";
          const statusIcon = success === 0 ? "⚠️" : "✅";

          return `${statusIcon} ${label}: ${success}/${total} = ${successRatio}`;
        })
        .join("\n");

      const intervalDetailsUtr = intervals
        .map(({ label, duration }) => {
          const startTime = new Date(now - duration);
          const filteredTransactions = merchantTransactions.filter(
            (tx) => tx.updatedAt >= startTime
          );

          const total = filteredTransactions.length;
          const utrSubmission = filteredTransactions.filter(
            (tx) => tx.user_submitted_utr && tx.user_submitted_utr.length > 0
          ).length;

          const statusIcon = utrSubmission === 0 ? "⚠️" : "✅";
          const utrSubmissionRatio =
            total === 0
              ? "0.00%"
              : Math.min(((utrSubmission / total) * 100).toFixed(2), 100) + "%";

          return `${statusIcon} ${label}: ${utrSubmission}/${total} = ${utrSubmissionRatio}`;
        })
        .join("\n");

      payinSuccessMsg += `🔔${merchant.code} - SR 🔔\n${intervalDetails}\n\n`;
      utrSubmissionMsg += `🔔${merchant.code} - SR 🔔\n${intervalDetailsUtr}\n\n`;
    }

    await sendTelegramDashboardSuccessRatioMessage(
      config?.telegramRatioAlertsChatId,
      payinSuccessMsg,
      config?.telegramBotToken
    );

    await sendTelegramDashboardSuccessRatioMessage(
      config?.telegramRatioAlertsChatId,
      utrSubmissionMsg,
      config?.telegramBotToken
    );
  } catch (error) {
    console.error("Error calculating interval success ratios:", error.message);
  }
}; 

formattedSuccessRatiosByMerchant();

// gatherAllData("H", "Asia/Kolkata")

const formatePrice = (price, currencySymbol = "₹") => {
  return `${currencySymbol} ${Number(price).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

export default gatherAllData;
