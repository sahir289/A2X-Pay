import { DefaultResponse } from "../helper/customResponse.js"
import duplicateDisputeTransactionService from "../services/duplicateDisputeTransactionService.js";
import { checkValidation } from "../helper/validationHelper.js";
import payInServices from "../services/payInServices.js";
import { sendTelegramDisputeMessage } from "../helper/sendTelegramMessages.js";
import { calculateCommission } from "../helper/utils.js";
import config from "../../config.js";
import merchantRepo from "../repository/merchantRepo.js";

class DuplicateDisputeTransactionController {
    async handleDuplicateDisputeTransaction(req, res, next) {
        try {
            checkValidation(req)
            const { payInId } = req.params;
            let apiData = {}
            const oldPayInData = await payInServices.getPayInDetails(payInId);
            const merchantRes = await merchantRepo.getMerchantById(oldPayInData.merchant_id)
            const payinCommission = await calculateCommission(oldPayInData?.amount, merchantRes?.payin_commission);
            const durMs = new Date() - oldPayInData?.createdAt;
            const durSeconds = Math.floor((durMs / 1000) % 60).toString().padStart(2, '0');
            const durMinutes = Math.floor((durSeconds / 60) % 60).toString().padStart(2, '0');
            const durHours = Math.floor((durMinutes / 60) % 24).toString().padStart(2, '0');
            const duration = `${durHours}:${durMinutes}:${durSeconds}`;
            if (oldPayInData.status === "DUPLICATE") {
                apiData = {
                    ...req.body,
                    status: "SUCCESS",
                    payin_commission: payinCommission,
                    duration: duration,
                }
            }
            else {
                apiData = {
                    ...req.body,
                    status: "SUCCESS",
                    duration: duration,
                }
            }
            const duplicateDisputeTransactionRes = await duplicateDisputeTransactionService.handleDuplicateDisputeTransaction(payInId, apiData, oldPayInData.status);
            const entryType = oldPayInData.status === 'DUPLICATE' ? 'Duplicate Entry' : 'Dispute Entry';
            await sendTelegramDisputeMessage(
                config?.telegramDuplicateDisputeChatId,
                oldPayInData,
                duplicateDisputeTransactionRes,
                config?.telegramBotToken,
                entryType,
              );
            return DefaultResponse(res, 200, "Transaction updated successfully", duplicateDisputeTransactionRes);
        } catch (error) {
            next(error);
        }
    }
}

export default new DuplicateDisputeTransactionController();