import loginServices from "../services/loginServices.js";
import { DefaultResponse } from "../helper/customResponse.js"
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
            next(err);
        }
    }
}

export default new LogInController()