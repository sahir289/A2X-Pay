import { DefaultResponse } from "../helper/customResponse.js"
import duplicateDisputeTransactionService from "../services/duplicateDisputeTransactionService.js";
import { checkValidation } from "../helper/validationHelper.js";

class DuplicateDisputeTransactionController {
    async handleDuplicateDisputeTransaction(req, res, next) {
        try {
            checkValidation(req)
            const { payInId } = req.params;
            const apiData = {
                ...req.body,
                status: "SUCCESS",
            }
            const duplicateDisputeTransactionRes = await duplicateDisputeTransactionService.handleDuplicateDisputeTransaction(payInId, apiData);
            return DefaultResponse(res, 200, "Transaction updated successfully", duplicateDisputeTransactionRes);
        } catch (error) {
            next(error);
        }
    }
}

export default new DuplicateDisputeTransactionController();