import { DefaultResponse } from "../helper/customResponse.js"
import { checkValidation } from "../helper/validationHelper.js";
import { CustomError } from "../models/customError.js";
import merchantRepo from "../repository/merchantRepo.js";
import settlementService from "../services/settlementService.js";

class SettlementController {

    async createSettlement(req, res, next) {
        try {
            checkValidation(req)
            const merchant = await merchantRepo.getMerchantByCode(req.body.code);
            if (!merchant) {
                throw new CustomError(404, 'Merchant does not exist')
            }
            delete req.body.code;
            const data = await settlementService.createSettlement({
                ...req.body,
                status: "INITIATED",
                merchant_id: merchant.id,
            });
            return DefaultResponse(res, 201, "Settlement created successfully");
        } catch (err) {
            next(err);
        }
    }

    async getSettlement(req, res, next) {
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
                method,
                refrence_id
            } = req.query;
            const take = Number(qTake) || 10;
            const skip = take * (Number(page || 1) - 1);
            const data = await settlementService.getSettlement(skip, take, id, code, status, amount, acc_no, method, refrence_id);
            return DefaultResponse(res, 201, "Settlement fetched successfully!", data);
        } catch (err) {
            next(err);
        }
    }

    async updateSettlement(req, res, next) {
        try {
            const payload = {
                ...req.body,
            }
            if (req.body.refrence_id) {
                payload.status = "SUCCESS";
            }
            const data = await settlementService.updateSettlement(req.params.id, payload);
            return DefaultResponse(res, 200, "Settlement Updated!", data);
        } catch (err) {
            next(err);
        }
    }
}

export default new SettlementController()