import { DefaultResponse } from "../helper/customResponse.js"
import { checkValidation } from "../helper/validationHelper.js";
import { CustomError } from "../models/customError.js";
import merchantRepo from "../repository/merchantRepo.js";
import userRepo from "../repository/userRepo.js";
import settlementService from "../services/settlementService.js";
import { logger } from "../utils/logger.js";

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
            logger.info(err);
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
                refrence_id,
                includeSubMerchant
            } = req.query;

            const user = await userRepo.getUserByUsernameRepo(req.user.userName)

            let Codes;

            if ((user?.role !== "ADMIN" || !user?.code) && !code) {
                Codes = user?.code.join(",")
            }
            else {
                Codes = code
            }

            const take = Number(qTake) || 20;
            const skip = take * (Number(page || 1) - 1);
            const data = await settlementService.getSettlement(skip, take, parseInt(id), Codes, status, amount, acc_no, method, refrence_id, includeSubMerchant);
            return DefaultResponse(res, 201, "Settlement fetched successfully!", data);
        } catch (err) {
            logger.info(err);
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
            if (req.body.status == "INITIATED") {
                payload.refrence_id = "";
                payload.rejected_reason = "";
            }
            if (req.body.rejected_reason) {
                payload.status = "REVERSED";
            }
            const data = await settlementService.updateSettlement(req.params.id, payload);
            return DefaultResponse(res, 200, "Settlement Updated!", data);
        } catch (err) {
            logger.info(err);
            next(err);
        }
    }
}

export default new SettlementController()