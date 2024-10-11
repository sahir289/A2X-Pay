import payInRepo from "../repository/payInRepo.js";
import merchantRepo from "../repository/merchantRepo.js";
import bankAccountRepo from "../repository/bankAccountRepo.js";

class DuplicateDisputeTransactionService {
    async handleDuplicateDisputeTransaction(payInId, data, prevStatus) {
        const duplicateDisputeTransactionData = await payInRepo.updatePayInData(payInId, data);
        if (prevStatus === "DUPLICATE") {
            const merchantRes = await merchantRepo.updateMerchant(duplicateDisputeTransactionData.merchant_id, duplicateDisputeTransactionData.amount)
            const bankAccountRes = await bankAccountRepo.updateBankAccountBalance(duplicateDisputeTransactionData.bank_acc_id, duplicateDisputeTransactionData.amount)  
        }
        else if (prevStatus === "DISPUTE") {
             const merchantRes = await merchantRepo.updateMerchant(duplicateDisputeTransactionData.merchant_id, duplicateDisputeTransactionData.amount)
        }
        return duplicateDisputeTransactionData;
    }
}

export default new DuplicateDisputeTransactionService();