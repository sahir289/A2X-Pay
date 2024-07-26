import { DefaultResponse } from "../helper/customResponse.js"
import botResponseRepo from "../repository/botResponseRepo.js";
class BotResponseController {
    async botResponse(req, res, next) {
        try {

            const data = req.body?.message?.text;
            console.log("🚀 ~ BotResponseController ~ botResponse ~ data:", data)

            const splitData = data.split(' ');

            const updatedData = {
                status: splitData[0],
                amount: parseFloat(splitData[1]),
                amount_code: splitData[2],
                utr: splitData[3]
            }

            const botRes = await botResponseRepo.botResponse(updatedData)
            console.log("🚀 ~ BotResponseController ~ botResponse ~ botRes:", botRes)
            
            return DefaultResponse(
                res,
                201,
                "Response get successfully",
            );
        } catch (err) {
            // Handle errors and pass them to the next middleware
            next(err);
        }
    }
}

export default new BotResponseController()