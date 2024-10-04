import axios from "axios";

export async function sendTelegramMessage(chatId, data, TELEGRAM_BOT_TOKEN, replyToMessageId) {
    const message = `
      <b>UPI-AMOUNT:</b> ${data?.amount}
      <b>UTR-IDS:</b> ${data?.utr}
    `;

    const sendMessageUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    try {
        await axios.post(sendMessageUrl, {
            chat_id: chatId,
            text: message,
            parse_mode: 'HTML',
            reply_to_message_id: replyToMessageId // Add this line to reply to a specific message
        });
    } catch (error) {
        console.error('Error sending message to Telegram:', error);
    }
}

export async function sendTelegramDisputeMessage(chatId, oldData, newData , TELEGRAM_BOT_TOKEN) {
    const message = `
      <b><u>Dispute/Duplicate Entry:-</u></b> 
      <b>PayIn Id:</b>${oldData.id}
      <b>User Id:</b>${oldData.user_id}
      <b>Merchant Order Id:</b>${oldData.merchantOrderId}
      <b>Merchant Id:</b>${oldData.merchant_id}
      <b>Amount:</b>${oldData.amount}
      <b>UPI Short Code:</b>${oldData.upi_short_code}
      <b>UTR:</b>${oldData.user_submitted_utr}
      <b>Status:</b>${oldData.status}
      <b>Bank Name:</b>${oldData.bank_name}
      <b><u>New Entry:-</u></b> 
      <b>PayIn Id:</b>${newData.id}
      <b>User Id:</b>${newData.user_id}
      <b>Merchant Order Id:</b>${newData.merchantOrderId}
      <b>Merchant Id:</b>${newData.merchant_id}
      <b>Amount:</b>${newData.amount}
      <b>UPI Short Code:</b>${newData.upi_short_code}
      <b>UTR:</b>${newData.user_submitted_utr}
      <b>Status:</b>${newData.status}
      <b>Bank Name:</b>${newData.bank_name}
    `;

    const sendMessageUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    try {
        await axios.post(sendMessageUrl, {
            chat_id: chatId,
            text: message,
            parse_mode: 'HTML',
            reply_to_message_id: replyToMessageId // Add this line to reply to a specific message
        });
    } catch (error) {
        console.error('Error sending message to Telegram:', error);
    }
}


export async function sendSuccessMessageTelegram(chatId, merchantOrderIdTele, TELEGRAM_BOT_TOKEN, replyToMessageId) {
    // Assuming `orderNo` is part of the `data` object
    const orderNo = merchantOrderIdTele;

    // Construct the message
    const message = `💵 Order No. ${orderNo} is confirmed! ✅`;

    const sendMessageUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    try {
        await axios.post(sendMessageUrl, {
            chat_id: chatId,
            text: message,
            parse_mode: 'HTML',
            reply_to_message_id: replyToMessageId // Add this line to reply to a specific message
        });
    } catch (error) {
        console.error('Error sending message to Telegram:', error);
    }
}


export async function sendErrorMessageTelegram(chatId, merchantOrderIdTele, TELEGRAM_BOT_TOKEN, replyToMessageId) {
    // Construct the error message
    const message = `⛔ No Merchant Order ID ${merchantOrderIdTele} found. Please recheck input`;

    const sendMessageUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    try {
        await axios.post(sendMessageUrl, {
            chat_id: chatId,
            text: message,
            parse_mode: 'HTML',
            reply_to_message_id: replyToMessageId // Add this line to reply to a specific message
        });
    } catch (error) {
        console.error('Error sending message to Telegram:', error);
    }
}


export async function sendErrorMessageUtrNotFoundTelegramBot(chatId, UTR, TELEGRAM_BOT_TOKEN, replyToMessageId) {
    // Construct the error message
    const message = `⛔ No deposit with UTR ${UTR} found. Please check `;

    const sendMessageUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    try {
        await axios.post(sendMessageUrl, {
            chat_id: chatId,
            text: message,
            parse_mode: 'HTML',
            reply_to_message_id: replyToMessageId // Add this line to reply to a specific message
        });
    } catch (error) {
        console.error('Error sending message to Telegram:', error);
    }
}

export async function sendAlreadyConfirmedMessageTelegramBot(chatId, merchantOrderIdTele, TELEGRAM_BOT_TOKEN, replyToMessageId) {
    // Construct the error message
    const message = `✅ Order No. ${merchantOrderIdTele}  is already confirmed `;

    const sendMessageUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    try {
        await axios.post(sendMessageUrl, {
            chat_id: chatId,
            text: message,
            parse_mode: 'HTML',
            reply_to_message_id: replyToMessageId // Add this line to reply to a specific message
        });
    } catch (error) {
        console.error('Error sending message to Telegram:', error);
    }
}


export async function sendErrorMessageNoDepositFoundTelegramBot(chatId, Utr, TELEGRAM_BOT_TOKEN, replyToMessageId) {
    // Construct the error message
    const message = `⛔ No deposit with UTR ${Utr}  found. Please check  `;

    const sendMessageUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    try {
        await axios.post(sendMessageUrl, {
            chat_id: chatId,
            text: message,
            parse_mode: 'HTML',
            reply_to_message_id: replyToMessageId // Add this line to reply to a specific message
        });
    } catch (error) {
        console.error('Error sending message to Telegram:', error);
    }
}

export async function sendErrorMessageUtrOrAmountNotFoundImgTelegramBot(chatId, TELEGRAM_BOT_TOKEN, replyToMessageId) {
    // Construct the error message
    const message = `⛔ Please check this slip `;

    const sendMessageUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    try {
        await axios.post(sendMessageUrl, {
            chat_id: chatId,
            text: message,
            parse_mode: 'HTML',
            reply_to_message_id: replyToMessageId // Add this line to reply to a specific message
        });
    } catch (error) {
        console.error('Error sending message to Telegram:', error);
    }
}