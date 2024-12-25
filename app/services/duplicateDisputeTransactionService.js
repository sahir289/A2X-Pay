import payInRepo from "../repository/payInRepo.js";
import merchantRepo from "../repository/merchantRepo.js";
import bankAccountRepo from "../repository/bankAccountRepo.js";
import { logger } from "../utils/logger.js";

class DuplicateDisputeTransactionService {
    async handleDuplicateDisputeTransaction(payInId, data, prevStatus) {
        try {
            const duplicateDisputeTransactionData = await payInRepo.updatePayInData(payInId, data);
            if (prevStatus === "DUPLICATE") {
                const merchantRes = await merchantRepo.updateMerchant(duplicateDisputeTransactionData.merchant_id, duplicateDisputeTransactionData.amount)
                const bankAccountRes = await bankAccountRepo.updateBankAccountBalance(duplicateDisputeTransactionData.bank_acc_id, duplicateDisputeTransactionData.amount)
            }
            else if (prevStatus === "DISPUTE") {
                const merchantRes = await merchantRepo.updateMerchant(duplicateDisputeTransactionData.merchant_id, duplicateDisputeTransactionData.amount)
            }

            const notifyData = {
                status: duplicateDisputeTransactionData?.status,
                merchantOrderId: duplicateDisputeTransactionData?.merchant_order_id,
                payinId: duplicateDisputeTransactionData?.id,
                amount: duplicateDisputeTransactionData?.confirmed,
                req_amount: duplicateDisputeTransactionData?.amount,
                utr_id: duplicateDisputeTransactionData?.utr
            };

            try {
                logger.info('Sending notification to merchant', { notify_url: duplicateDisputeTransactionData?.notify_url, notify_data: notifyData });
                //When we get the notify url we will add it.
                const notifyMerchant = await axios.post(duplicateDisputeTransactionData?.notify_url, notifyData);
                logger.info('Sending notification to merchant', {
                    status: notifyMerchant.status,
                    data: notifyMerchant.data,
                })

            } catch (error) {
                logger.error("Error sending notification:", error);
            }
            return duplicateDisputeTransactionData;
        }
        catch (error) {
            logger.error("Error updating payin data:", error);
            next(error);
        }
    }
}

export default new DuplicateDisputeTransactionService();