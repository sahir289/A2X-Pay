import axios from "axios";

export async function sendTelegramMessage(chatId, data, TELEGRAM_BOT_TOKEN, replyToMessageId) {
    console.log("🚀 ~ sendTelegramMessage ~ data:", data);
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
        console.log('Message sent successfully');
    } catch (error) {
        console.error('Error sending message to Telegram:', error);
    }
}


export async function sendSuccessMessageTelegram(chatId, merchantOrderIdTele, TELEGRAM_BOT_TOKEN, replyToMessageId) {
    console.log("🚀 ~ sendTelegramMessage ~ data:", merchantOrderIdTele);

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
        console.log('Message sent successfully');
    } catch (error) {
        console.error('Error sending message to Telegram:', error);
    }
}


export async function sendErrorMessageTelegram(chatId, merchantOrderIdTele, TELEGRAM_BOT_TOKEN, replyToMessageId) {
    console.log("🚀 ~ sendTelegramMessage ~ data:", merchantOrderIdTele);

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
        console.log('Error message sent successfully');
    } catch (error) {
        console.error('Error sending message to Telegram:', error);
    }
}


export async function sendErrorMessageUtrNotFoundTelegramBot(chatId, UTR, TELEGRAM_BOT_TOKEN, replyToMessageId) {
    console.log("🚀 ~ sendTelegramMessage ~ data:", UTR);

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
        console.log('Error message sent successfully');
    } catch (error) {
        console.error('Error sending message to Telegram:', error);
    }
}

export async function sendAlreadyConfirmedMessageTelegramBot(chatId, merchantOrderIdTele, TELEGRAM_BOT_TOKEN, replyToMessageId) {
    console.log("🚀 ~ sendAlreadyConfirmedMessageTelegramBot ~ merchantOrderIdTele:", merchantOrderIdTele)

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
        console.log('Error message sent successfully');
    } catch (error) {
        console.error('Error sending message to Telegram:', error);
    }
}


export async function sendErrorMessageNoDepositFoundTelegramBot(chatId, Utr, TELEGRAM_BOT_TOKEN, replyToMessageId) {
    console.log("🚀 ~ sendAlreadyConfirmedMessageTelegramBot ~ Utr:", Utr)

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
        console.log('Error message sent successfully');
    } catch (error) {
        console.error('Error sending message to Telegram:', error);
    }
}

export async function sendErrorMessageUtrOrAmountNotFoundImgTelegramBot(chatId, TELEGRAM_BOT_TOKEN, replyToMessageId) {
    console.log("🚀 ~ sendAlreadyConfirmedMessageTelegramBot ~ Utr:", Utr)

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
        console.log('Error message sent successfully');
    } catch (error) {
        console.error('Error sending message to Telegram:', error);
    }
}