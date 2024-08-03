import merchantRepo from "../repository/merchantRepo.js";
import withdrawService from "../services/withdrawService.js";
import { checkValidation } from "../helper/validationHelper.js"
import { DefaultResponse } from "../helper/customResponse.js"
import { getAmountFromPerc } from "../helper/utils.js";

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
                payout_commision: getAmountFromPerc(merchant.payin_commission, req.body.amount),
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
                merchant_order_id,
                user_id,
                sno,
                payout_commision,
                utr_id,
                acc_holder_name,
            } = req.query;
            const take = Number(qTake) || 10;
            const skip = take * (Number(page || 1) - 1);
            const data = await withdrawService.getWithdraw(skip, take, id, code, status, amount, acc_no, merchant_order_id, user_id, Number(sno), payout_commision, utr_id, acc_holder_name);
            return DefaultResponse(res, 200, "Payout fetched successfully!", data);

        } catch (err) {
            next(err);
        }
    }

    async updateWithdraw(req, res, next) {
        try {
            const payload = {
                ...req.body,
            };
            if(req.body.utr_id){
                payload.status = "SUCCESS";
            }
            if(req.body.rejected_reason){
                payload.status = "REVERSED";
            }
            const data = await withdrawService.updateWithdraw(req.params.id, payload);
            return DefaultResponse(res, 200, "Payout Updated!", data);
        } catch (err) {
            console.log(err);
            next(err);
        }
    }
}

export default new WithdrawController();