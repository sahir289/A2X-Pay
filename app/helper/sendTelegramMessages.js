import axios from "axios";
import payInRepo from "../repository/payInRepo.js";
export async function sendTelegramMessage(
  chatId,
  data,
  TELEGRAM_BOT_TOKEN,
  replyToMessageId
) {
  const message = `
      <b>UPI-AMOUNT:</b> ${data?.amount}
      <b>UTR-IDS:</b> ${data?.utr}
      <b>Time Stamp:</b> ${data?.timeStamp}
    `;

  const sendMessageUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  try {
    await axios.post(sendMessageUrl, {
      chat_id: chatId,
      text: message,
      parse_mode: "HTML",
      reply_to_message_id: replyToMessageId, // Add this line to reply to a specific message
    });
  } catch (error) {
    console.error("Error sending message to Telegram:", error);
  }
}

export async function sendTelegramDisputeMessage(
  chatId,
  oldData,
  newData,
  TELEGRAM_BOT_TOKEN,
  entryType
) {
  const message = `
        <b><u>${entryType}:</u></b> 
            <b>📋 Status:</b> ${
              oldData.status === "DUPLICATE" ? "⛔ DUPLICATE" : oldData.status
            }
            <b>🧾 UTR:</b> ${oldData.user_submitted_utr}
            <b>⛔ Amount:</b> ${oldData.amount}
            <b>💳 UPI Short Code:</b> ${oldData.upi_short_code}
            <b>🏦 Bank Name:</b> ${oldData.bank_name}
            <b>Merchant Order Id:</b> ${oldData.merchant_order_id}
            <b>PayIn Id:</b> ${oldData.id}
            <b>Merchant Id:</b> ${oldData.merchant_id}
            <b>User Id:</b> ${oldData.user_id}

        <b><u>New Entry:</u></b> 
            <b>📋 Status:</b> ${
              newData.status === "SUCCESS" ? "✅ SUCCESS" : newData.status
            }
            <b>🧾 UTR:</b> ${newData.user_submitted_utr}
            <b>✅ Amount:</b> ${newData.amount}
            <b>💳 UPI Short Code:</b> ${newData.upi_short_code}
            <b>🏦 Bank Name:</b> ${newData.bank_name}
            <b>Merchant Order Id:</b> ${newData.merchant_order_id}
            <b>PayIn Id:</b> ${newData.id}
            <b>Merchant Id:</b> ${newData.merchant_id}
            <b>User Id:</b> ${newData.user_id}
    `;
  const sendMessageUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  try {
    const response = await axios.post(sendMessageUrl, {
      chat_id: chatId,
      text: message,
      parse_mode: "HTML",
    });
  } catch (error) {
    console.error("Error sending message to Telegram:", error);
  }
}

export async function sendSuccessMessageTelegram(
  chatId,
  merchantOrderIdTele,
  TELEGRAM_BOT_TOKEN,
  replyToMessageId,
  fromUI
) {
  // Assuming `orderNo` is part of the `data` object
  const orderNo = merchantOrderIdTele;

  // Construct the message
  const message = `💵 Order No. ${orderNo} is confirmed! ✅`;

  if (!fromUI) {
    const sendMessageUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    try {
      await axios.post(sendMessageUrl, {
        chat_id: chatId,
        text: message,
        parse_mode: "HTML",
        reply_to_message_id: replyToMessageId, // Add this line to reply to a specific message
      });
    } catch (error) {
      console.error("Error sending message to Telegram:", error);
    }
  } else {
    return message;
  }
}

export async function sendErrorMessageTelegram(
  chatId,
  merchantOrderIdTele,
  TELEGRAM_BOT_TOKEN,
  replyToMessageId,
  fromUI
) {
  // Construct the error message
  const message = `⛔ No Merchant Order ID ${merchantOrderIdTele} found. Please recheck input`;

  if (!fromUI) {
    const sendMessageUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    try {
      await axios.post(sendMessageUrl, {
        chat_id: chatId,
        text: message,
        parse_mode: "HTML",
        reply_to_message_id: replyToMessageId, // Add this line to reply to a specific message
      });
    } catch (error) {
      console.error("Error sending message to Telegram:", error);
    }
  } else {
    return message;
  }
}

export async function sendErrorMessageUtrNotFoundTelegramBot(
  chatId,
  UTR,
  TELEGRAM_BOT_TOKEN,
  replyToMessageId
) {
  // Construct the error message
  const message = `⛔ No deposit with UTR ${UTR} found. Please check `;

  const sendMessageUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  try {
    await axios.post(sendMessageUrl, {
      chat_id: chatId,
      text: message,
      parse_mode: "HTML",
      reply_to_message_id: replyToMessageId, // Add this line to reply to a specific message
    });
  } catch (error) {
    console.error("Error sending message to Telegram:", error);
  }
}

export async function sendAlreadyConfirmedMessageTelegramBot(
  chatId,
  utr,
  TELEGRAM_BOT_TOKEN,
  replyToMessageId,
  existingPayinData,
  getPayInData,
  fromUI
) {
  let payinData;
  const hasSuccess = existingPayinData.some(
    (item) => item.status === "SUCCESS"
  );
  if (hasSuccess) {
    payinData = existingPayinData.filter(
      (item) => item.status === "SUCCESS"
    )[0];
  } else {
    payinData = existingPayinData[existingPayinData.length - 1];
  }
  // Construct the error message
  let message;
  if (payinData) {
    if (payinData?.status === "SUCCESS") {
      message = `✅ UTR ${utr} is already confirmed with this orderId ${payinData?.merchant_order_id}`;
    } else {
      message = `🚨 UTR ${utr} is already ${payinData?.status} with this orderId ${payinData?.merchant_order_id}`;
    }
  } else {
    if (getPayInData?.status === "SUCCESS") {
      message = `🚨 Merchant Order ID: ${getPayInData.merchant_order_id}
                is Already Confirmed with UTR: ${getPayInData.user_submitted_utr}`;
    } else {
      message = `🚨 Merchant Order ID: ${getPayInData.merchant_order_id}
                is Already Marked ${getPayInData.status} with UTR: ${getPayInData.user_submitted_utr}`;
    }
  }

  if (!fromUI) {
    const sendMessageUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    try {
      await axios.post(sendMessageUrl, {
        chat_id: chatId,
        text: message,
        parse_mode: "HTML",
        reply_to_message_id: replyToMessageId, // Add this line to reply to a specific message
      });
    } catch (error) {
      console.error("Error sending message to Telegram:", error);
    }
  } else {
    return message;
  }
}

export async function sendAmountDisputeMessageTelegramBot(
  chatId,
  amount,
  disputedAmount,
  TELEGRAM_BOT_TOKEN,
  replyToMessageId,
  fromUI
) {
  // Construct the error message
  let message;

  if (!fromUI) {
    message = `
        <b><u>AMOUNT DISPUTED:</u></b> 
            <b>⛔ Amount:</b> ${disputedAmount}
            <b>✅ Confirmed Amount:</b> ${amount}
    `;
    const sendMessageUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    try {
      await axios.post(sendMessageUrl, {
        chat_id: chatId,
        text: message,
        parse_mode: "HTML",
        reply_to_message_id: replyToMessageId, // Add this line to reply to a specific message
      });
    } catch (error) {
      console.error("Error sending message to Telegram:", error);
    }
  } else {
    message = `
        AMOUNT DISPUTED: 
            ⛔ Amount: ${disputedAmount}
            ✅ Confirmed Amount: ${amount}
    `;
    return message;
  }
}

export async function sendBankMismatchMessageTelegramBot(
  chatId,
  bankNameFromBank,
  bankNameFromMerchant,
  TELEGRAM_BOT_TOKEN,
  replyToMessageId,
  fromUI
) {
  // Construct the error message

  let message;

  if (!fromUI) {
    message = `
            <b><u>BANK MISMATCH :</u></b> 
                <b>⛔ Amount should be credited in :</b> ${bankNameFromMerchant}
                <b>✅ Amount credited in :</b> ${bankNameFromBank}
        `;
    const sendMessageUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    try {
      await axios.post(sendMessageUrl, {
        chat_id: chatId,
        text: message,
        parse_mode: "HTML",
        reply_to_message_id: replyToMessageId, // Add this line to reply to a specific message
      });
    } catch (error) {
      console.error("Error sending message to Telegram:", error);
    }
  } else {
    message = `
            BANK MISMATCH :
                ⛔ Amount should be credited in : ${bankNameFromMerchant}
                ✅ Amount credited in : ${bankNameFromBank}
        `;
    return message;
  }
}

export async function sendErrorMessageNoDepositFoundTelegramBot(
  chatId,
  Utr,
  TELEGRAM_BOT_TOKEN,
  replyToMessageId,
  fromUI
) {
  // Construct the error message
  const message = `⛔ No deposit with UTR ${Utr} found. Please check  `;

  if (!fromUI) {
    const sendMessageUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    try {
      await axios.post(sendMessageUrl, {
        chat_id: chatId,
        text: message,
        parse_mode: "HTML",
        reply_to_message_id: replyToMessageId, // Add this line to reply to a specific message
      });
    } catch (error) {
      console.error("Error sending message to Telegram:", error);
    }
  } else {
    return message;
  }
}

export async function sendErrorMessageUtrOrAmountNotFoundImgTelegramBot(
  chatId,
  TELEGRAM_BOT_TOKEN,
  replyToMessageId
) {
  // Construct the error message
  const message = `⛔ Please check this slip `;

  const sendMessageUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  try {
    await axios.post(sendMessageUrl, {
      chat_id: chatId,
      text: message,
      parse_mode: "HTML",
      reply_to_message_id: replyToMessageId, // Add this line to reply to a specific message
    });
  } catch (error) {
    console.error("Error sending message to Telegram:", error);
  }
}

export async function sendBankNotAssignedAlertTelegram(
  chatId,
  getMerchantApiKeyByCode,
  TELEGRAM_BOT_TOKEN
) {
  // Construct the alert message
  const message = `<b>⛔ Bank not Assigned with :</b> ${getMerchantApiKeyByCode.code}`;

  const sendMessageUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

  try {
    const response = await axios.post(sendMessageUrl, {
      chat_id: chatId,
      text: message,
      parse_mode: "HTML",
    });

    // Optionally log the response from Telegram API
    // console.log('Telegram Alert response:', response.data);
  } catch (error) {
    console.error("Error sending bank not assigned alert to Telegram:", error);
  }
}

export async function sendTelegramDashboardReportMessage(
  chatId,
  formattedPayIns,
  formattedPayOuts,
  formattedBankPayIns,
  formattedBankPayOuts,
  type,
  TELEGRAM_BOT_TOKEN,
  totalDepositAmount,
  totalWithdrawAmount,
  totalBankDepositAmount,
  totalBankWithdrawAmount
  // formattedRatios
) {
  const currentDate = new Date().toISOString().split("T")[0];
  const now = new Date();
  const istTime = new Date(
    now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
  );

  let startHour = istTime.getHours() - 1;
  let endHour = (startHour + 1) % 24; // Wrap around if it's 23 (to handle midnight)

  const startAmpm = startHour >= 12 ? "PM" : "AM";
  const endAmpm = endHour >= 12 ? "PM" : "AM";

  // Convert hours to 12-hour format
  startHour = startHour % 12 || 12;
  endHour = endHour % 12 || 12;

  const formattedTime = `${startHour}${startAmpm}-${endHour}${endAmpm}`;
  const timeStamp = type === "Hourly Report" ? formattedTime : currentDate;

  const excludeList = ["anna247", "anna777", "matkafun"];

  const filteredPayIns = formattedPayIns.filter(
    (item) => !excludeList.some((excluded) => item.startsWith(excluded))
  );

  // Get only the excluded payins and sum their amounts
  const excludeListPayins = formattedPayIns.filter((item) =>
    excludeList.some((excluded) => item.startsWith(excluded))
  );

  const excludeListPayinsAmount = excludeListPayins.reduce((sum, item) => {
    let amount = 0;
    if (typeof item === "string") {
      const match = item.match(/₹\s*([\d,]+\.\d{2})/);
      if (match) {
        amount = parseFloat(match[1].replace(/,/g, ""));
      }
    } else if (item.amount) {
      amount = parseFloat(item.amount);
    }
    return sum + amount;
  }, 0);

  totalDepositAmount -= excludeListPayinsAmount;

  const filteredPayOuts = formattedPayOuts.filter(
    (item) => !excludeList.some((excluded) => item.startsWith(excluded))
  );

  // Get only the excluded payouts and sum their amounts
  const excludeListPayouts = formattedPayOuts.filter((item) =>
    excludeList.some((excluded) => item.startsWith(excluded))
  );

  const excludeListPayoutsAmount = excludeListPayouts.reduce((sum, item) => {
    let amount = 0;
    if (typeof item === "string") {
      const match = item.match(/₹\s*([\d,]+\.\d{2})/);
      if (match) {
        amount = parseFloat(match[1].replace(/,/g, ""));
      }
    } else if (item.amount) {
      amount = parseFloat(item.amount);
    }
    return sum + amount;
  }, 0);

  totalWithdrawAmount -= excludeListPayoutsAmount;

  const message = `
<b>${type} (${timeStamp}) IST</b>

<b>💰 Deposits</b>
${
  filteredPayIns.length > 0
    ? filteredPayIns.join("\n")
    : "No deposits available."
}

<b>Total Deposits:</b> ${totalDepositAmount}

<b>🏦 Withdrawals</b>
${
  filteredPayOuts.length > 0
    ? filteredPayOuts.join("\n")
    : "No withdrawals available."
}

<b>Total Withdrawals:</b> ${totalWithdrawAmount}

<b>✅ Bank Account Deposits</b>
${
  formattedBankPayIns.length > 0
    ? formattedBankPayIns.join("\n")
    : "No bank account deposits available."
}

<b>Total Bank Account Deposits:</b> ${totalBankDepositAmount}

<b>✅ Bank Account Withdrawals</b>
${
  formattedBankPayOuts.length > 0
    ? formattedBankPayOuts.join("\n")
    : "No bank account withdrawals available."
}

<b>Total Bank Account Withdrawals:</b> ${totalBankWithdrawAmount}
    `;

  // Send the message to Telegram
  const sendMessageUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

  try {
    const response = await axios.post(sendMessageUrl, {
      chat_id: chatId,
      text: message,
      parse_mode: "HTML",
    });
  } catch (error) {
    console.error(
      "Error sending Telegram message:",
      error.response?.data || error.message
    );
  }
}

export async function sendTelegramAnnaDashboardReportMessage(
  chatId,
  formattedPayIns,
  formattedPayOuts,
  type,
  TELEGRAM_BOT_TOKEN
  // formattedRatios
) {
  const currentDate = new Date().toISOString().split("T")[0];
  const now = new Date();
  const istTime = new Date(
    now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
  );

  let startHour = istTime.getHours() - 1;
  let endHour = (startHour + 1) % 24; // Wrap around if it's 23 (to handle midnight)

  const startAmpm = startHour >= 12 ? "PM" : "AM";
  const endAmpm = endHour >= 12 ? "PM" : "AM";

  // Convert hours to 12-hour format
  startHour = startHour % 12 || 12;
  endHour = endHour % 12 || 12;

  const formattedTime = `${startHour}${startAmpm}-${endHour}${endAmpm}`;
  const timeStamp = type === "Hourly Report" ? formattedTime : currentDate;

  const excludeList = ["anna247", "anna777", "matkafun"];

  // Get only the excluded payins and sum their amounts
  const excludeListPayins = formattedPayIns.filter((item) =>
    excludeList.some((excluded) => item.startsWith(excluded))
  );

  const excludeListPayinsAmount = excludeListPayins.reduce((sum, item) => {
    let amount = 0;
    if (typeof item === "string") {
      const match = item.match(/₹\s*([\d,]+\.\d{2})/);
      if (match) {
        amount = parseFloat(match[1].replace(/,/g, ""));
      }
    } else if (item.amount) {
      amount = parseFloat(item.amount);
    }
    return sum + amount;
  }, 0);

  // Get only the excluded payouts and sum their amounts
  const excludeListPayouts = formattedPayOuts.filter((item) =>
    excludeList.some((excluded) => item.startsWith(excluded))
  );

  const excludeListPayoutsAmount = excludeListPayouts.reduce((sum, item) => {
    let amount = 0;
    if (typeof item === "string") {
      const match = item.match(/₹\s*([\d,]+\.\d{2})/);
      if (match) {
        amount = parseFloat(match[1].replace(/,/g, ""));
      }
    } else if (item.amount) {
      amount = parseFloat(item.amount);
    }
    return sum + amount;
  }, 0);

  const message = `
<b>${type} (${timeStamp}) IST</b>

<b>💰 Deposits</b>
${
  excludeListPayins.length > 0
    ? excludeListPayins.join("\n")
    : "No deposits available."
}

<b>Total Deposits:</b> ${excludeListPayinsAmount}

<b>🏦 Withdrawals</b>
${
  excludeListPayouts.length > 0
    ? excludeListPayouts.join("\n")
    : "No withdrawals available."
}

<b>Total Withdrawals:</b> ${excludeListPayoutsAmount}
    `;

  // Send the message to Telegram
  const sendMessageUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

  try {
    const response = await axios.post(sendMessageUrl, {
      chat_id: chatId,
      text: message,
      parse_mode: "HTML",
    });
  } catch (error) {
    console.error(
      "Error sending Telegram message:",
      error.response?.data || error.message
    );
  }
}

export async function sendTelegramDashboardMerchantGroupingReportMessage(
  chatId,
  formattedPayIns,
  formattedPayOuts,
  formattedBankPayIns,
  formattedBankPayOuts,
  type,
  TELEGRAM_BOT_TOKEN,
  totalDepositAmount,
  totalWithdrawAmount,
  totalBankDepositAmount,
  totalBankWithdrawAmount
  // formattedRatios
) {
  const currentDate = new Date().toISOString().split("T")[0];
  const now = new Date();
  const istTime = new Date(
    now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
  );

  let startHour = istTime.getHours() - 1;
  let endHour = (startHour + 1) % 24; // Wrap around if it's 23 (to handle midnight)

  const startAmpm = startHour >= 12 ? "PM" : "AM";
  const endAmpm = endHour >= 12 ? "PM" : "AM";

  // Convert hours to 12-hour format
  startHour = startHour % 12 || 12;
  endHour = endHour % 12 || 12;

  const formattedTime = `${startHour}${startAmpm}-${endHour}${endAmpm}`;
  const timeStamp = type === "Hourly Report" ? formattedTime : currentDate;

  const excludeList = ["anna247", "anna777", "matkafun"];

  const filteredPayIns = formattedPayIns.filter(
    (item) => !excludeList.some((excluded) => item.startsWith(excluded))
  );

  // Get only the excluded payins and sum their amounts
  const excludeListPayins = formattedPayIns.filter((item) =>
    excludeList.some((excluded) => item.startsWith(excluded))
  );

  const excludeListPayinsAmount = excludeListPayins.reduce((sum, item) => {
    let amount = 0;
    if (typeof item === "string") {
      const match = item.match(/₹\s*([\d,]+\.\d{2})/);
      if (match) {
        amount = parseFloat(match[1].replace(/,/g, ""));
      }
    } else if (item.amount) {
      amount = parseFloat(item.amount);
    }
    return sum + amount;
  }, 0);

  totalDepositAmount -= excludeListPayinsAmount;

  const filteredPayOuts = formattedPayOuts.filter(
    (item) => !excludeList.some((excluded) => item.startsWith(excluded))
  );

  // Get only the excluded payouts and sum their amounts
  const excludeListPayouts = formattedPayOuts.filter((item) =>
    excludeList.some((excluded) => item.startsWith(excluded))
  );

  const excludeListPayoutsAmount = excludeListPayouts.reduce((sum, item) => {
    let amount = 0;
    if (typeof item === "string") {
      const match = item.match(/₹\s*([\d,]+\.\d{2})/);
      if (match) {
        amount = parseFloat(match[1].replace(/,/g, ""));
      }
    } else if (item.amount) {
      amount = parseFloat(item.amount);
    }
    return sum + amount;
  }, 0);

  totalWithdrawAmount -= excludeListPayoutsAmount;

  const message = `
<b>${type} (${timeStamp}) IST</b>

<b>💰 Deposits</b>
${
  filteredPayIns.length > 0
    ? filteredPayIns.join("\n")
    : "No deposits available."
}

<b>Total Deposits:</b> ${totalDepositAmount}

<b>🏦 Withdrawals</b>
${
  filteredPayOuts.length > 0
    ? filteredPayOuts.join("\n")
    : "No withdrawals available."
}

<b>Total Withdrawals:</b> ${totalWithdrawAmount}

<b>✅ Bank Account Deposits</b>
${
  formattedBankPayIns.length > 0
    ? formattedBankPayIns.join("\n")
    : "No bank account deposits available."
}

<b>Total Bank Account Deposits:</b> ${totalBankDepositAmount}

<b>✅ Bank Account Withdrawals</b>
${
  formattedBankPayOuts.length > 0
    ? formattedBankPayOuts.join("\n")
    : "No bank account withdrawals available."
}

<b>Total Bank Account Withdrawals:</b> ${totalBankWithdrawAmount}
    `;

  // Send the message to Telegram
  const sendMessageUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

  try {
    const response = await axios.post(sendMessageUrl, {
      chat_id: chatId,
      text: message,
      parse_mode: "HTML",
    });
  } catch (error) {
    console.error(
      "Error sending Telegram message:",
      error.response?.data || error.message
    );
  }
}

export async function sendTelegramDashboardSuccessRatioMessage(
  chatId,
  message,
  TELEGRAM_BOT_TOKEN
) {
  const sendMessageUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

  try {
    const response = await axios.post(sendMessageUrl, {
      chat_id: chatId,
      text: message,
      parse_mode: "HTML",
    });
  } catch (error) {
    console.error(`Error sending Telegram success ratio alerts`, error);
  }
}

export async function sendErrorMessageNoMerchantOrderIdFoundTelegramBot(
  chatId,
  TELEGRAM_BOT_TOKEN,
  replyToMessageId,
  withoutImage,
  fromUI
) {
  // Construct the error message
  let message;
  if (withoutImage) {
    message = `⛔ Please mention Merchant Order Id in Caption`;
  } else {
    message = `⛔ Please mention Merchant Order Id`; // If withoutImage is true, set this message
  }

  if (!fromUI) {
    const sendMessageUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    try {
      await axios.post(sendMessageUrl, {
        chat_id: chatId,
        text: message,
        parse_mode: "HTML",
        reply_to_message_id: replyToMessageId, // Add this line to reply to a specific message
      });
    } catch (error) {
      console.error("Error sending message to Telegram:", error);
    }
  } else {
    return message;
  }
}

export async function sendErrorMessageNoImageFoundTelegramBot(
  chatId,
  TELEGRAM_BOT_TOKEN,
  replyToMessageId
) {
  // Construct the error message
  const message = `⛔ Please add screenshot of the Payment!`;

  const sendMessageUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  try {
    await axios.post(sendMessageUrl, {
      chat_id: chatId,
      text: message,
      parse_mode: "HTML",
      reply_to_message_id: replyToMessageId, // Add this line to reply to a specific message
    });
  } catch (error) {
    console.error("Error sending message to Telegram:", error);
  }
}

export async function sendMerchantOrderIDStatusDuplicateTelegramMessage(
  chatId,
  getPayInData,
  utr,
  TELEGRAM_BOT_TOKEN,
  replyToMessageId
) {
  let existingPayinData;
  existingPayinData = await payInRepo.getPayinDataByUtr(utr);
  if (existingPayinData.length == 0) {
    existingPayinData = await payInRepo.getPayinDataByUsrSubmittedUtr(utr);
  }
  let payinData;
  const hasSuccess = existingPayinData.some(
    (item) => item.status === "SUCCESS"
  );
  if (hasSuccess) {
    payinData = existingPayinData.filter(
      (item) => item.status === "SUCCESS"
    )[0];
  } else {
    payinData = existingPayinData[existingPayinData.length - 1];
  }
  // Construct the error message
  let message;
  if (payinData) {
    if (payinData?.status === "SUCCESS") {
      message = `✅ UTR ${utr} is already confirmed with this orderId ${payinData?.merchant_order_id}`;
    } else {
      message = `🚨 UTR ${utr} is already ${payinData?.status} with this orderId ${payinData?.merchant_order_id}`;
    }
  } else {
    if (getPayInData?.status === "SUCCESS") {
      message = `✅ Merchant Order ID: ${getPayInData.merchant_order_id}
                is Already Confirmed with UTR: ${getPayInData.user_submitted_utr}`;
    } else {
      message = `🚨 Merchant Order ID: ${getPayInData.merchant_order_id}
                is Already Marked ${getPayInData.status} with UTR: ${getPayInData.user_submitted_utr}`;
    }
  }

  const sendMessageUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  try {
    await axios.post(sendMessageUrl, {
      chat_id: chatId,
      text: message,
      parse_mode: "HTML",
      reply_to_message_id: replyToMessageId, // Add this line to reply to a specific message
    });
  } catch (error) {
    console.error("Error sending message to Telegram:", error);
  }
}

export async function sendCheckUTRHistoryTelegramMessage(
  chatId,
  data,
  TELEGRAM_BOT_TOKEN
) {
  const sendMessageUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  try {
    await axios.post(sendMessageUrl, {
      chat_id: chatId,
      text: data,
      parse_mode: "HTML",
    });
  } catch (error) {
    console.error("Error sending message to Telegram:", error);
  }
}

export async function sendErrorMessageUtrMismatchTelegramBot(
  chatId,
  user_submitted_utr,
  utr,
  TELEGRAM_BOT_TOKEN,
  replyToMessageId,
  fromUI
) {
  // Construct the error message
  const message = `⛔ UTR: ${utr} does not match with User Submitted UTR: ${user_submitted_utr}`;

  if (!fromUI) {
    const sendMessageUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    try {
      await axios.post(sendMessageUrl, {
        chat_id: chatId,
        text: message,
        parse_mode: "HTML",
        reply_to_message_id: replyToMessageId, // Add this line to reply to a specific message
      });
    } catch (error) {
      console.error("Error sending message to Telegram:", error);
    }
  } else {
    return message;
  }
}

export async function sendResetEntryTelegramMessage(
  chatId,
  data,
  TELEGRAM_BOT_TOKEN
) {
  const message = `
      <b><u>🔔 Entry Reset Alert 🔔</u></b> 
          <b>Merchant Order ID:</b> ${data.merchant_order_id}
          <b>Old Status:</b> ${data.status}
          <b>Old User Submitted UTR:</b> ${
            data?.user_submitted_utr ? data.user_submitted_utr : "--"
          }
          <b>Old UTR:</b> ${data?.utr ? data.utr : "--"}
          <b>Old Amount:</b> ${data?.amount}
          <b>Old Confirmed Amount:</b> ${
            data?.confirmed ? data.confirmed : "--"
          }
  `;
  const sendMessageUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  try {
    await axios.post(sendMessageUrl, {
      chat_id: chatId,
      text: message,
      parse_mode: "HTML",
    });
  } catch (error) {
    console.error("Error sending message to Telegram:", error);
  }
}
