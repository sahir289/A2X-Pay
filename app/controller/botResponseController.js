import { DefaultResponse } from "../helper/customResponse.js"
import botResponseRepo from "../repository/botResponseRepo.js";
import { io } from "../../index.js";

class BotResponseController {
    async botResponse(req, res, next) {
        try {
            const data = req.body?.message?.text;
            console.log("🚀 ~ BotResponseController ~ botResponse ~ data:", data);

            const splitData = data.split(' ');

            const status = splitData[0];
            const amount = parseFloat(splitData[1]);
            const amount_code = splitData[2];
            const utr = splitData[3];

            // Validate amount, amount_code, and utr
            const isValidAmount = amount <= 100000;
            const isValidAmountCode = amount_code !== "nil" && amount_code.length === 5;
            const isValidUtr = utr.length === 12;

            if (isValidAmount && isValidUtr) {
                const updatedData = {
                    status,
                    amount,
                    utr
                };

                // Conditionally include amount_code only if it is valid
                if (isValidAmountCode) {
                    updatedData.amount_code = amount_code;
                }

                const botRes = await botResponseRepo.botResponse(updatedData);
                console.log("🚀 ~ BotResponseController ~ botResponse ~ botRes:", botRes);

                // Notify all connected clients about the new entry
                io.emit("new-entry", {
                    message: 'New entry added',
                    data: updatedData
                });

                return DefaultResponse(
                    res,
                    201,
                    "Response received successfully",
                );
            } else {
                // Handle case where data is invalid
                return DefaultResponse(
                    res,
                    400,
                    "Invalid data received"
                );
            }
        } catch (err) {
            // Handle errors and pass them to the next middleware
            next(err);
        }
    }

}

export default new BotResponseController()