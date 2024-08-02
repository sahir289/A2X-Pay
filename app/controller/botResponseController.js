import axios from "axios";
import { io } from "../../index.js";
import { DefaultResponse } from "../helper/customResponse.js";
import botResponseRepo from "../repository/botResponseRepo.js";
import payInRepo from "../repository/payInRepo.js";
import { checkValidation } from "../helper/validationHelper.js";

class BotResponseController {
  async botResponse(req, res, next) {
    try {
      const data = req.body?.message?.text;

      console.log(data, "data");
      const splitData = data.split(" ");

      const status = splitData[0];
      const amount = parseFloat(splitData[1]);
      const amount_code = splitData[2];
      const utr = splitData[3];

      // Validate amount, amount_code, and utr
      const isValidAmount = amount <= 100000;
      const isValidAmountCode =
        amount_code !== "nil" && amount_code.length === 5;
      const isValidUtr = utr.length === 12;

      console.log(isValidAmount, isValidUtr, utr.length, "klll");

      if (isValidAmount && isValidUtr) {
        const updatedData = {
          status,
          amount,
          utr,
        };

        if (isValidAmountCode) {
          updatedData.amount_code = amount_code;
        }
        const botRes = await botResponseRepo.botResponse(updatedData);

        const checkPayInUtr = await payInRepo.getPayInDataByUtrOrUpi(
          utr,
          amount_code
        );

        // 121892128612
        if (checkPayInUtr.length !== 0) {
          const payInData = {
            confirmed: botRes?.amount,
            status: "SUCCESS",
            is_notified: true,
            utr: botRes?.utr,
            approved_at: new Date(),
          };

          const updatePayInDataRes = await payInRepo.updatePayInData(
            checkPayInUtr[0]?.id,
            payInData
          );

          const notifyData = {
            status: "success",
            merchantOrderId: updatePayInDataRes?.merchant_order_id,
            payinId: updatePayInDataRes?.id,
            amount: updatePayInDataRes?.confirmed,
          };
          console.log(
            "🚀 ~ BotResponseController ~ botResponse ~ notifyData:",
            notifyData
          );
          try {
            //when we get the correct notify url;
            // const notifyMerchant = await axios.post(checkPayInUtr[0]?.notify_url, notifyData)
            // console.log("🚀 ~ BotResponseController ~ botResponse ~ notifyMerchant:", notifyMerchant)
          } catch (error) {
            console.log(
              "🚀 ~ BotResponseController ~ botResponse ~ error:",
              error
            );
          }
        }

        // Notify all connected clients about the new entry
        // io.emit("new-entry", {
        //     message: 'New entry added',
        //     data: updatedData
        // });

        res.status(201).json({
          success: true,
          message: "Response received successfully",
          data: updatedData,
        });
      } else {
        res.status(400).json({
          success: false,
          message: "Invalid data received",
        });
      }
    } catch (err) {
      console.log("🚀 ~ BotResponseController ~ botResponse ~ err:", err);
      next(err);
    }
  }

  async getBotResponse(req, res, next) {
    try {
      checkValidation(req);
      const query = req.query;

      const botRes = await botResponseRepo.getBotResponse(query);

      return DefaultResponse(
        res,
        200,
        "Bot response fetched successful",
        botRes
      );
    } catch (error) {
      next(error);
    }
  }
}

export default new BotResponseController();
