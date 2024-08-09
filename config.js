
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
        clientEmail:Env?.CLIENT_EMAIL

    };
}

export default {
    ...config(process.env),
};