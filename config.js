
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

// Env file configuration
function config(Env) {

    return {
        port: Env?.PORT,
        // reactAppBaseUrl: Env?.REACT_APP_BASE_URL,
        databaseUrl: Env?.DATABASE_URL,
        accessTokenSecretKey: Env?.ACCESS_TOKEN_SECRET_KEY,
        accessTokenExpireTime: 24 * 60 * 60, // in seconds
        reactFrontOrigin: Env?.REACT_FRONT_ORIGIN,
        reactPaymentOrigin: Env?.REACT_PAYMENT_ORIGIN,
        ocrPrivateKey:Env?.OCR_PRIVATE_KEY,
        clientEmail:Env?.CLIENT_EMAIL,
        bucketName:Env?.BUCKET_NAME,
        bucketRegion:Env?.BUCKET_REGION,
        accessKeyS3:Env?.ACCESS_KEY,
        secretKeyS3:Env?.SECRET_ACCESS_KEY,
        telegramBotToken:Env?.TELEGRAM_BOT_TOKEN,
        telegramAlertsBotToken:Env?.TELEGRAM_ALERTS_BOT_TOKEN, // currently not in use
        telegramRatioAlertsChatId:Env?.TELEGRAM_RATIO_ALERTS_CHAT_ID,
        telegramDashboardChatId:Env?.TELEGRAM_DASHBOARD_CHAT_ID,
        telegramAnnaDashboardChatId:Env?.TELEGRAM_ANNA_DASHBOARD_CHAT_ID,
        telegramDashboardMerchantGroupingChatId: Env?.TELEGRAM_DASHBOARD_MERCHANT_GROUPING_CHAT_ID,
        telegramBankAlertChatId:Env?.TELEGRAM_BANK_ALERT_CHAT_ID,
        telegramDuplicateDisputeChatId:Env?.TELEGRAM_DISPUTE_DUPLICATE_CHAT_ID,
        telegramCheckUTRHistoryChatId:Env?.TELEGRAM_CHECK_UTR_HISTORY_CHAT_ID,
        telegramEntryResetChatId:Env?.TELEGRAM_ENTRY_RESET_HISTORY_CHAT_ID,
        telegramOcrBotToken:Env?.TELEGRAM_OCR_BOT_TOKEN,
        telegramCheckUtrBotToken:Env?.TELEGRAM_CHECK_UTR_BOT_TOKEN,
        ekoPaymentsActivateUrl:Env?.EKO_PAYMENTS_ACTIVATE_URL,
        ekoPaymentsInitiateUrl:Env?.EKO_PAYMENTS_INITIATE_URL,
        ekoPaymentsStatusUrl:Env?.EKO_PAYMENTS_STATUS_URL,
        ekoPaymentsStatusUrlByClientRefId:Env?.EKO_PAYMENTS_STATUS_URL_BY_CLIENT_REF_ID,
        ekoWalletBalanceEnquiryUrl:Env?.EKO_WALLET_BALANCE_INQUIRY_URL,
        ekoRegisteredMobileNo:Env?.EKO_REGISTERED_MOBILE_NO,
        ekoAccessKey:Env?.EKO_ACCESS_AUTHENTICATOR_KEY,
        ekoServiceCode:Env?.EKO_SERVICE_CODE,
        ekoUserCode:Env?.EKO_USER_CODE,
        ekoInitiatorId:Env?.EKO_INITIATOR_ID,
        ekoDeveloperKey:Env?.EKO_DEVELOPER_KEY,
        proxyCheckApiKey:Env?.PROXY_CHECK_API_KEY,
        latitudeBlock:Env?.BLOCK_LAT,
        longitudeBlock:Env?.BLOCK_LONG,
        nodeProductionLogs:Env?.NODE_ENV,
        awsLocationAccessKey:Env?.AMAZON_LOCATION_API_KEY,
        awsRegion:Env?.AWS_REGION,
        awsAccessKeyAdmin:Env?.AWS_ACCESS_KEY_ADMIN,
        awsSecretKeyAdmin:Env?.AWS_SECRET_ACCESS_KEY_ADMIN,
        blazePePaymentsInitiateUrl:Env?.BLAZEPE_CREATE_PAYOUT_URL,
        blazePeGetPayoutStatusUrl:Env?.BLAZEPE_GET_PAYOUT_STATUS_URL,
        merchantCodeBlazePay:Env?.MERCHANT_CODE_BLAZEPE,
        merchantSecretBlazePay:Env?.MERCHANT_SECRET_BLAZEPE,
        ourUrlForGettingCallbackFromBlazePe:Env?.OUR_NOTIFY_URL_FOR_GETTING_CALLBACK_FROM_BLAZEPE,
        cashfreeClientId:Env?.CLIENT_ID,
        cashfreeClientSecret:Env?.CLIENT_SECRET,
        cashfreeCreateOrderUrl:Env?.CREATE_ORDER_URL,
        cashfreePayOrderUrl:Env?.PAY_ORDER_URL,
        payu_key: Env?.PAYU_KEY,
        payu_salt: Env?.PAYU_SALT,
        payu_url: Env?.PAYU_URL,
        a2_pay_collection_id: Env?.A2PAY_COLLECTION_ID,
        a2_pay_Salt: Env?.A2PAY_SALT,
        a2_pay_Url: Env?.A2PAY_URL,
    };
}

export default {
    ...config(process.env),
};