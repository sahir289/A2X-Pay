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

export async function sendBankNotAssignedAlertTelegram(chatId, getMerchantApiKeyByCode, TELEGRAM_BOT_TOKEN) {
    // Construct the alert message
    const message = `<b>Bank not Assigned with :</b> ${getMerchantApiKeyByCode.code}`;

    const sendMessageUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    try {
        await axios.post(sendMessageUrl, {
            chat_id: chatId,
            text: message,
            parse_mode: 'HTML',
        }); 
    } catch (error) {
        console.error('Error sending bank not assigned alert to Telegram:', error);
    }
}

export async function sendTelegramDashboardReportMessage(
    chatId,
    payIns,
    payOuts,
    bankPayIns,
    reportType,
    startDate,
    endDate,     
    TELEGRAM_BOT_TOKEN,
) {
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
    };

    const formatTransactions = (transactions) => {
        return transactions.map(t =>
            `${t.merchant_id || t.bank_acc_id}: ${formatCurrency(t._sum.amount)} (${t._count.id})`
        ).join('\n') || 'No transactions available';
    };

   
    // Calculate totals
    const totalPayIn = payIns.reduce((sum, t) => sum + t._sum.amount, 0);
    const totalPayOut = payOuts.reduce((sum, t) => sum + t._sum.amount, 0);
    const totalBankPayIn = bankPayIns.reduce((sum, t) => sum + t._sum.amount, 0);

    // Create message content based on report type
    const timePeriod = reportType === "H" ? "Hourly Report" : "24-Hour Report";
    const message = `
<b>${timePeriod}</b>
<i>From ${startDate.toISOString()} to ${endDate.toISOString()}</i>

<b>Diposit:</b>
${formatTransactions(payIns)}
<b>Total PayIn: ${formatCurrency(totalPayIn)}</b>

<b>Withdraw:</b>
${formatTransactions(payOuts)}
<b>Total PayOut: ${formatCurrency(totalPayOut)}</b>

<b>Bank Accounts:</b>
${formatTransactions(bankPayIns)}
<b>Total Bank Deposit: ${formatCurrency(totalBankPayIn)}</b>

<b>Net Flow: ${formatCurrency(totalPayIn - totalPayOut)}</b>
`;

    // Send message to Telegram
    const sendMessageUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    try {
        const response = await axios.post(sendMessageUrl, {
            chat_id: chatId,
            text: message,
            parse_mode: 'HTML',
        });

        // Log successful response
        console.log('Message sent successfully:', response.data);
    } catch (error) {
        // Log detailed error
    }
}

