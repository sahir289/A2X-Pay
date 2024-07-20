import jwt from 'jsonwebtoken'
import config from '../../config.js';
export const verifyAccessToken = (accessToken) => {
    const verified = jwt.verify(accessToken, config.accessTokenSecretKey);
    return verified;
};