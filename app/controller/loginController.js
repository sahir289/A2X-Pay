import loginServices from "../services/loginServices.js";
import { DefaultResponse } from "../helper/customResponse.js"
import { logger } from "../utils/logger.js";
class LogInController {
    // Login User
    async login(req, res, next) {
        try {
            const { userName, password,confirmOverRide=false } = req.body;
 
            const newAccessToken = await loginServices.login(userName,password,confirmOverRide)
            return DefaultResponse(
                res,
                200,
                "User logged in successfully",
                newAccessToken
            );
        } catch (err) {
            // Handle errors and pass them to the next middleware
            logger.info(err);
            next(err);
        }
    }

    // Verify Password while edit and delete functionality
    async comparePassword(req, res, next) {
        try {
            const { userName, password } = req.body;
            const result = await loginServices.comparePassword(userName, password)
            if (result) {
                return DefaultResponse(
                    res,
                    200,
                    "Password Verified",
                );
            } else {
                return DefaultResponse(
                    res,
                    401,
                    "Invalid Password",
                );
            }
        } catch (err) {
            // Handle errors and pass them to the next middleware
            logger.info(err);
            next(err);
        }
    }
}

export default new LogInController()