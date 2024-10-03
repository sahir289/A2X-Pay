import payInRepo from "../repository/payInRepo.js";

class DuplicateDisputeTransactionService {
    async handleDuplicateDisputeTransaction(payInId, data) {
        const duplicateDisputeTransactionData = await payInRepo.updatePayInData(payInId, data);
        return duplicateDisputeTransactionData;
    }
}

export default new DuplicateDisputeTransactionService();