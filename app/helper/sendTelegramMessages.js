import axios from "axios";
export async function sendTelegramMessage(chatId, data, TELEGRAM_BOT_TOKEN, replyToMessageId) {
    const message = `
      <b>UPI-AMOUNT:</b> ${data?.amount}
      <b>UTR-IDS:</b> ${data?.utr}
    `;

    if (data?.bankName || data?.timeStamp){
        message += `
        <b>Bank Name:</b> ${data?.bankName}
        <b>Time Stamp:</b> ${data?.timeStamp}
      `;
    }

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

export async function sendTelegramDisputeMessage(chatId, oldData, newData, TELEGRAM_BOT_TOKEN, entryType) {
    const message = `
        <h3><u>${entryType}:</u></h3> 
            <b>📋 Status:</b> ${oldData.status === 'DUPLICATE' ? '⛔ DUPLICATE' : oldData.status}
            <b>🧾 UTR:</b> ${oldData.user_submitted_utr}
            <b>⛔ Amount:</b> ${oldData.amount}
            <b>💳 UPI Short Code:</b> ${oldData.upi_short_code}
            <b>🏦 Bank Name:</b> ${oldData.bank_name}
            <b>Merchant Order Id:</b> ${oldData.merchant_order_id}
            <b>PayIn Id:</b> ${oldData.id}
            <b>Merchant Id:</b> ${oldData.merchant_id}
            <b>User Id:</b> ${oldData.user_id}

        <h3><u>New Entry:</u></h3> 
            <b>📋 Status:</b> ${newData.status === 'SUCCESS' ? '✅ SUCCESS' : newData.status}
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
            parse_mode: 'HTML',
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

export async function sendAlreadyConfirmedMessageTelegramBot(chatId, utr, TELEGRAM_BOT_TOKEN, replyToMessageId) {
    // Construct the error message
    const message = `✅ UTR ${utr} is already confirmed `;

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

export async function sendBankNotAssignedAlertTelegram(chatId, getMerchantApiKeyByCode, TELEGRAM_BOT_TOKEN) {
    // Construct the alert message
    const message = `<b>⛔ Bank not Assigned with :</b> ${getMerchantApiKeyByCode.code}`;

    const sendMessageUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    
    try {
        const response = await axios.post(sendMessageUrl, {
            chat_id: chatId,
            text: message,
            parse_mode: 'HTML',
        });
        
        // Optionally log the response from Telegram API
      // console.log('Telegram Alert response:', response.data);
    } catch (error) {
        console.error('Error sending bank not assigned alert to Telegram:', error);
    }
}

export async function sendTelegramDashboardReportMessage(
    chatId,
    formattedPayIns,
    formattedPayOuts,
    formattedBankPayIns,
    formattedBankPayOuts,
    type,
    TELEGRAM_BOT_TOKEN
) {
    const currentDate = new Date().toISOString().split("T")[0];
    const message = `
<b>${type} (${currentDate})</b>

<b>💰 Deposits</b>
${formattedPayIns.length > 0 ? formattedPayIns.join("\n") : 'No deposits available.'}

<b>🏦 Withdrawals</b>
${formattedPayOuts.length > 0 ? formattedPayOuts.join("\n") : 'No withdrawals available.'}

<b>✅ Bank Account Deposits</b>
${formattedBankPayIns.length > 0 ? formattedBankPayIns.join("\n") : 'No bank account deposits available.'}

<b>✅ Bank Account Withdrawals</b>
${formattedBankPayOuts.length > 0 ? formattedBankPayOuts.join("\n") : 'No bank account withdrawals available.'}
    `;

    // Send the message to Telegram
    const sendMessageUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

    try {
        const response = await axios.post(sendMessageUrl, {
            chat_id: chatId,
            text: message,
            parse_mode: 'HTML',
        });
       // console.log('Telegram Dashboard response:', response.data);
    } catch (error) {
        console.error('Error sending Telegram message:', error.response?.data || error.message);
    }
}



