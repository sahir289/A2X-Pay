import { DefaultResponse } from "../helper/customResponse.js"
import duplicateDisputeTransactionService from "../services/duplicateDisputeTransactionService.js";
import { checkValidation } from "../helper/validationHelper.js";
import payInServices from "../services/payInServices.js";
import { sendTelegramDisputeMessage } from "../helper/sendTelegramMessages.js";
import config from "../../config.js";

class DuplicateDisputeTransactionController {
    async handleDuplicateDisputeTransaction(req, res, next) {
        try {
            checkValidation(req)
            const { payInId } = req.params;
            const apiData = {
                ...req.body,
                status: "SUCCESS",
            }
            const oldPayInData = await payInServices.getPayInDetails(payInId);
            const duplicateDisputeTransactionRes = await duplicateDisputeTransactionService.handleDuplicateDisputeTransaction(payInId, apiData, oldPayInData.status);
            await sendTelegramDisputeMessage(
                config?.telegramDuplicateDisputeChatId,
                oldPayInData,
                duplicateDisputeTransactionRes,
                config?.telegramDuplicateDisputeChatId
              );
            return DefaultResponse(res, 200, "Transaction updated successfully", duplicateDisputeTransactionRes);
        } catch (error) {
            next(error);
        }
    }
}

export default new DuplicateDisputeTransactionController();