import { DefaultResponse } from "../helper/customResponse.js"
import duplicateDisputeTransactionService from "../services/duplicateDisputeTransactionService.js";
import { checkValidation } from "../helper/validationHelper.js";
import payInServices from "../services/payInServices.js";
import { sendTelegramDisputeMessage } from "../helper/sendTelegramMessages.js";
import { calculateCommission } from "../helper/utils.js";
import config from "../../config.js";
import merchantRepo from "../repository/merchantRepo.js";
import payInRepo from "../repository/payInRepo.js";

class DuplicateDisputeTransactionController {
    async handleDuplicateDisputeTransaction(req, res, next) {
        try {
            checkValidation(req)
            const { payInId } = req.params;
            let apiData = {}
            const oldPayInData = await payInServices.getPayInDetails(payInId);
            const oldPayInUtrData = oldPayInData?.user_submitted_utr;
            const merchantRes = await merchantRepo.getMerchantById(oldPayInData.merchant_id)
            const payinCommission = calculateCommission(oldPayInData?.confirmed, merchantRes?.payin_commission);

            const durMs = new Date() - oldPayInData?.createdAt;
            const durSeconds = Math.floor((durMs / 1000) % 60).toString().padStart(2, '0');
            const durMinutes = Math.floor((durSeconds / 60) % 60).toString().padStart(2, '0');
            const durHours = Math.floor((durMinutes / 60) % 24).toString().padStart(2, '0');
            const duration = `${durHours}:${durMinutes}:${durSeconds}`;

            if (oldPayInData?.status === "DUPLICATE") {
                let duplicateSuccess = false;
                const allDeposits = await payInRepo.getPayinDataByUsrSubmittedUtr(oldPayInData?.user_submitted_utr);
                    allDeposits?.map( async (value, index) => {
                        if(value?.status !== 'SUCCESS' && value?.status !== 'DUPLICATE'){
                            duplicateSuccess = true;

                            apiData = {
                                utr: req?.body?.utr,
                                user_submitted_utr: req?.body?.utr,
                                status: "DUPLICATE",
                            }
                            await payInRepo.updatePayInData(value?.id, apiData)
                        }
                    })
                if(duplicateSuccess === true){
                    apiData = {
                        utr: oldPayInUtrData,
                        user_submitted_utr: oldPayInUtrData,
                        confirmed: oldPayInData?.confirmed,
                        status: "SUCCESS",
                        payin_commission: payinCommission,
                        duration: duration,
                    }
                    duplicateSuccess = false;
                } else {
                    apiData = {
                        ...req.body,
                        status: "SUCCESS",
                        confirmed: oldPayInData?.confirmed,
                        payin_commission: payinCommission,
                        duration: duration,
                    }
                }
            }
            else {
                apiData = {
                    ...req.body,
                    status: "SUCCESS",
                    payin_commission: payinCommission,
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