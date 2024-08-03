import merchantRepo from "../repository/merchantRepo.js";
import withdrawService from "../services/withdrawService.js";
import { checkValidation } from "../helper/validationHelper.js"
import { DefaultResponse } from "../helper/customResponse.js"

class WithdrawController {


    async createWithdraw(req, res, next) {
        try {
            checkValidation(req);
            const merchant = await merchantRepo.getMerchantByCode(req.body.code);
            if (!merchant) {
                throw new CustomError(404, 'Merchant does not exist')
            }
            delete req.body.code;
            const data = await withdrawService.createWithdraw({
                ...req.body,
                status: "INITIATED",
                merchant_id: merchant.id,
                payout_commission: merchant.payin_commission,
                currency: "INR",
            });
            return DefaultResponse(res, 201, "Payout created successfully");
        } catch (err) {
            next(err);
        }
    }

    async getWithdraw(req, res, next) {
        try {
            checkValidation(req)
            const {
                page,
                take: qTake,
                id,
                code,
                status,
                amount,
                acc_no,
            } = req.query;
            const take = Number(qTake) || 10;
            const skip = take * (Number(page || 1) - 1);
            const data = await withdrawService.getWithdraw(skip, take, parseInt(id), code, status, amount, acc_no);
            return DefaultResponse(res, 200, "Payout fetched successfully!", data);

        } catch (err) {
            console.log(err);
            next(err);
        }
    }

    async updateWithdraw(req, res, next) {
        try {
            const data = await withdrawService.updateWithdraw(req.params.id, payload);
            return DefaultResponse(res, 200, "Payout Updated!", data);
        } catch (err) {
            next(err);
        }
    }
}

export default new WithdrawController();