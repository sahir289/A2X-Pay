import config from "../../config.js";
import jwt from "jsonwebtoken"
export const generateAccessToken = (payload) => {
    const token = jwt.sign(payload, config.accessTokenSecretKey, {
        // expiresIn: config.accessTokenExpireTime,
    });
    return token;
}

export const getAmountFromPerc = (perc, amount)=>{
    return (amount/100) * perc;
}

export const calculateCommission = (amt, percentage) => {
    const amount = Number(amt)
    return (amount * percentage) / 100;
  };

