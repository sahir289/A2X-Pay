import axios from "axios";
import { io } from "../../index.js";
import { DefaultResponse } from "../helper/customResponse.js";
import botResponseRepo from "../repository/botResponseRepo.js";
import payInRepo from "../repository/payInRepo.js";
import { checkValidation } from "../helper/validationHelper.js";
import merchantRepo from "../repository/merchantRepo.js";
import { calculateCommission } from "../helper/utils.js";
import bankAccountRepo from "../repository/bankAccountRepo.js";

class BotResponseController {
  async botResponse(req, res, next) {
    try {
      const data = req.body?.message?.text;
      const splitData = data.split(" ");

      const status = splitData[0];
      const amount = parseFloat(splitData[1]);
      const amount_code = splitData[2];
      const utr = splitData[3];

      // Validate amount, amount_code, and utr
      const isValidAmount = amount;
      const isValidAmountCode =
        amount_code !== "nil" && amount_code.length === 5;
      const isValidUtr = utr.length === 12;

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
          amount_code,
        );
        const getMerchantToGetPayinCommissionRes = await merchantRepo.getMerchantById(checkPayInUtr[0]?.merchant_id)
        
        const payinCommission = await calculateCommission(botRes?.amount, getMerchantToGetPayinCommissionRes?.payin_commission);
        const durSeconds = Math.floor((new Date() - checkPayInUtr.at(0)?.createdAt) / 1000).toString().padStart(2, '0');
        const durMinutes = Math.floor(durSeconds / 60).toString().padStart(2, '0');
        const durHours = Math.floor(durMinutes / 60).toString().padStart(2, '0');
        const duration = `${durHours % 24}:${durMinutes % 60}:${durSeconds % 60}`;

        if (checkPayInUtr.length !== 0 && checkPayInUtr.at(0)?.amount == amount 
        // && checkPayInUtr.at(0)?.user_submitted_utr == utr
      ) {
          const payInData = {
            confirmed: botRes?.amount,
            status: "SUCCESS",
            is_notified: true,
            utr: botRes?.utr,
            approved_at: new Date(),
            duration: duration,
            payin_commission: payinCommission
          };

          const updatePayInDataRes = await payInRepo.updatePayInData(
            checkPayInUtr[0]?.id,
            payInData
          );

          const updateBankRes = await bankAccountRepo.updateBankAccountBalance(
            checkPayInUtr[0]?.bank_acc_id,
            parseFloat(amount)
          );
          const updateBotRes = await botResponseRepo?.updateBotResponseByUtr(botRes?.id,botRes?.utr)

          const notifyData = {
            status: "success",
            merchantOrderId: updatePayInDataRes?.merchant_order_id,
            payinId: updatePayInDataRes?.id,
            amount: updatePayInDataRes?.confirmed,
          };
          try {
            //when we get the correct notify url;
            // const notifyMerchant = await axios.post(checkPayInUtr[0]?.notify_url, notifyData)
          } catch (error) {
          }
        }
        else {
          const payInData = {
            confirmed: botRes?.amount,
            status: "DISPUTE",
            is_notified: true,
            utr: botRes?.utr,
            approved_at: new Date(),
            duration: duration,
            payin_commission: payinCommission
          };
          const updatePayInDataRes = await payInRepo.updatePayInData(
            checkPayInUtr[0]?.id,
            payInData
          );

          const updateBankRes = await bankAccountRepo.updateBankAccountBalance(
            checkPayInUtr[0]?.bank_acc_id,
            parseFloat(amount)
          );

          const updateBotRes = await botResponseRepo?.updateBotResponseByUtr(botRes?.id,botRes?.utr);

          const notifyData = {
            status: "dispute",
            merchantOrderId: updatePayInDataRes?.merchant_order_id,
            payinId: updatePayInDataRes?.id,
            amount: updatePayInDataRes?.confirmed,
          };
        }

        // Notify all connected clients about the new entry
        io.emit("new-entry", {
          message: 'New entry added',
          data: updatedData
        });

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
