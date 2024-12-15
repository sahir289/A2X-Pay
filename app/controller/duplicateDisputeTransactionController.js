import { DefaultResponse } from "../helper/customResponse.js"
import duplicateDisputeTransactionService from "../services/duplicateDisputeTransactionService.js";
import { checkValidation } from "../helper/validationHelper.js";
import payInServices from "../services/payInServices.js";
import { sendTelegramDisputeMessage } from "../helper/sendTelegramMessages.js";
import { calculateCommission } from "../helper/utils.js";
import config from "../../config.js";
import merchantRepo from "../repository/merchantRepo.js";
import payInRepo from "../repository/payInRepo.js";
import botResponseRepo from "../repository/botResponseRepo.js";
import { logger } from "../utils/logger.js";

class DuplicateDisputeTransactionController {
    async handleDuplicateDisputeTransaction(req, res, next) {
        try {
            checkValidation(req)
            const { payInId } = req.params;
            const { merchant_order_id } = req.body; 
            let apiData = {}
            const oldPayInData = await payInServices.getPayInDetails(payInId);
            const oldPayInUtrData = oldPayInData?.user_submitted_utr ? oldPayInData.user_submitted_utr : oldPayInData.utr;
            const getBankResponseByUtr = await botResponseRepo.getBotResByUtr(
                oldPayInUtrData
              );
            const merchantRes = await merchantRepo.getMerchantById(oldPayInData.merchant_id)
            const payinCommission = calculateCommission(req.body?.confirmed ? req.body?.confirmed : req.body?.amount , merchantRes?.payin_commission);

            const durMs = new Date() - oldPayInData?.createdAt;
            const durSeconds = Math.floor((durMs / 1000) % 60).toString().padStart(2, '0');
            const durMinutes = Math.floor((durSeconds / 60) % 60).toString().padStart(2, '0');
            const durHours = Math.floor((durMinutes / 60) % 24).toString().padStart(2, '0');
            const duration = `${durHours}:${durMinutes}:${durSeconds}`;

            if (oldPayInData?.status === "DUPLICATE") {
                apiData = {
                    ...req.body,
                    status: "SUCCESS",
                    payin_commission: payinCommission,
                    approved_at: new Date(),
                    duration: duration,
                }
            }
            else {
                if (merchant_order_id){
                    const newPayInData = await payInRepo.getPayInDataByMerchantOrderId(merchant_order_id);
                    if (newPayInData.status === "SUCCESS") {
                        return DefaultResponse(res, 400, `${merchant_order_id} is already in confirmed`);
                    } else if (newPayInData.status === "FAILED") {
                        return DefaultResponse(res, 400, `${merchant_order_id} is in failed`);
                    }
                    const payInData = {
                        confirmed: req?.body?.amount,
                        is_notified: true,
                        // user_submitted_utr: oldPayInData.user_submitted_utr,
                        utr: oldPayInData.utr,
                        approved_at: new Date(),
                        is_url_expires: true,
                        user_submitted_image: null,
                        duration: duration,
                        status: parseFloat(newPayInData?.amount) != parseFloat(req?.body?.amount) ? "DISPUTE" : newPayInData?.bank_name != oldPayInData?.bank_name ? "BANK_MISMATCH" : "SUCCESS",
                    };
                    
                    if (payInData.status === "SUCCESS") {
                        payInData.payin_commission = payinCommission;
                    }
                    
                    const updatedPayInData = await payInRepo.updatePayInData(newPayInData?.id, payInData)
                    const notifyData = {
                        status: updatedPayInData?.status,
                        merchantOrderId: updatedPayInData?.merchant_order_id,
                        payinId: updatedPayInData?.id,
                        amount: updatedPayInData?.confirmed,
                        req_amount: updatedPayInData?.amount,
                        utr_id: updatedPayInData?.utr
                    };
                
                    try {
                        logger.info('Sending notification to merchant', { notify_url: updatedPayInData?.notify_url, notify_data: notifyData });
                        //When we get the notify url we will add it.
                        const notifyMerchant = await axios.post(updatedPayInData?.notify_url, notifyData);
                        logger.info('Sending notification to merchant', {
                            status: notifyMerchant.status,
                            data: notifyMerchant.data,
                        })

                    } catch (error) {
                        logger.error("Error sending notification:", error);
                    }

                    delete req?.body?.merchant_order_id // deleted to avoid updating merchant_order_id in existing payin data
                    if(newPayInData?.merchant_order_id === oldPayInData?.merchant_order_id){
                        apiData = {
                            ...req.body,
                            status: "SUCCESS",
                            payin_commission: payinCommission,
                            approved_at: new Date(),
                            duration: duration,
                        }
                    } else {
                        delete req?.body?.amount
                        apiData = {
                            ...req.body,
                            status: "FAILED",
                            duration: duration,
                        }
                    }
                }
                else {
                    apiData = {
                        ...req.body,
                        status: "SUCCESS",
                        payin_commission: payinCommission,
                        approved_at: new Date(),
                        duration: duration,
                    }
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