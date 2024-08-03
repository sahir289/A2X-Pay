import config from "../../config.js";
import jwt from "jsonwebtoken"
export const generateAccessToken = (payload) => {
    const token = jwt.sign(payload, config.accessTokenSecretKey, {
        expiresIn: config.accessTokenExpireTime,
    });
    return token;
}


export const calculateCommission = (amount, percentage) => {
    return (amount * percentage) / 100;
  };