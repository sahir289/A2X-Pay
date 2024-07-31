// import { DefaultResponse } from "../helper/customResponse.js"
// import botResponseRepo from "../repository/botResponseRepo.js";
// import { io } from "../../index.js";

// class BotResponseController {
//     async botResponse(req, res, next) {
//         try {
//             io.emit("new-entry", {
//                 message: 'New entry added',
//                 data: updatedData
//             });

//             const data = req.body?.message?.text;
//             const splitData = data.split(' ');

//             const status = splitData[0];
//             const amount = parseFloat(splitData[1]);
//             const amount_code = splitData[2];
//             const utr = splitData[3];

//             // Validate amount, amount_code, and utr
//             const isValidAmount = amount <= 100000;
//             const isValidAmountCode = amount_code !== "nil" && amount_code.length === 5;
//             const isValidUtr = utr.length === 12;

//             if (isValidAmount && isValidUtr) {
//                 const updatedData = {
//                     status,
//                     amount,
//                     utr
//                 };

//                 // Conditionally include amount_code only if it is valid
//                 if (isValidAmountCode) {
//                     updatedData.amount_code = amount_code;
//                 }

//                 const botRes = await botResponseRepo.botResponse(updatedData);
//                 // Notify all connected clients about the new entry
//                 io.emit("new-entry", {
//                     message: 'New entry added',
//                     data: updatedData
//                 });

//                 return DefaultResponse(
//                     res,
//                     201,
//                     "Response received successfully",
//                 );
//             } else {
//                 // Handle case where data is invalid
//                 return DefaultResponse(
//                     res,
//                     400,
//                     "Invalid data received"
//                 );
//             }
//         } catch (err) {
//             // Handle errors and pass them to the next middleware
//             next(err);
//         }
//     }

// }

// export default new BotResponseController()

import { io } from "../../index.js";
import { DefaultResponse } from "../helper/customResponse.js";
import botResponseRepo from "../repository/botResponseRepo.js";
import payInRepo from "../repository/payInRepo.js";

class BotResponseController {
    // async botResponse(req, res, next) {
    //     try {
    //         // io.emit("new-entry", {
    //         //     message: 'New entry added',
    //         //     // data: updatedData
    //         // });
    //         const data = req.body?.message?.text;
    //         console.log("🚀 ~ BotResponseController ~ botResponse ~ data:", data)
    //         const splitData = data.split(' ');

    //         const status = splitData[0];
    //         const amount = parseFloat(splitData[1]);
    //         const amount_code = splitData[2];
    //         const utr = splitData[3];

    //         // Validate amount, amount_code, and utr
    //         const isValidAmount = amount <= 100000;
    //         const isValidAmountCode = amount_code !== "nil" && amount_code.length === 5;
    //         const isValidUtr = utr.length === 12;

    //         if (isValidAmount && isValidUtr) {
    //             const updatedData = {
    //                 status,
    //                 amount,
    //                 utr
    //             };

    //             if (isValidAmountCode) {
    //                 updatedData.amount_code = amount_code;
    //             }

    //             // const botRes = await botResponseRepo.botResponse(updatedData);
    //             // Notify all connected clients about the new entry
    //             io.emit("new-entry", {
    //                 message: 'New entry added',
    //                 // data: updatedData
    //             });

    //             // return DefaultResponse(
    //             //     res,
    //             //     201,
    //             //     "Response received successfully",
    //             //     updatedData
    //             // );
    //             res.send(true)
    //         } else {
    //             // return DefaultResponse(
    //             //     res,
    //             //     400,
    //             //     "Invalid data received"
    //             // );
    //             res.send(true)
    //         }

    //         // res.send(true)
    //     } catch (err) {
    //         next(err);
    //     }
    // }
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
    
                if (isValidAmountCode) {
                    updatedData.amount_code = amount_code;
                }
                console.log("🚀 ~ BotResponseController ~ botResponse ~ updatedData:", updatedData)
                const botRes = await botResponseRepo.botResponse(updatedData);
                console.log("🚀 ~ BotResponseController ~ botResponse ~ botRes:", botRes)

                console.log("🚀 ~ BotResponseController ~ botResponse ~ botRes?.utr:", botRes?.utr)
                const checkPayInUtr = await payInRepo.getPayInDataByUtr(botRes?.utr)
                console.log("🚀 ~ BotResponseController ~ botResponse ~ checkPayInUtr:", checkPayInUtr)

                // 121892128612
                if (checkPayInUtr.length !== 0){
                    console.log("sjdkfs")
                }

                // Notify all connected clients about the new entry
                // io.emit("new-entry", {
                //     message: 'New entry added',
                //     data: updatedData
                // });
    
                res.status(201).json({
                    success: true,
                    message: "Response received successfully",
                    data: updatedData
                });
            } else {
                res.status(400).json({
                    success: false,
                    message: "Invalid data received"
                });
            }
        } catch (err) {
            console.log("🚀 ~ BotResponseController ~ botResponse ~ err:", err)
            next(err);
        }
    }
}

export default new BotResponseController();
