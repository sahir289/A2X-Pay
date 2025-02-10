import { DefaultResponse } from "../helper/customResponse.js"
import { checkValidation } from "../helper/validationHelper.js";
import { CustomError } from "../models/customError.js";
import botResponseRepo from "../repository/botResponseRepo.js";
import merchantRepo from "../repository/merchantRepo.js";
import userRepo from "../repository/userRepo.js";
import vendorRepo from "../repository/vendorRepo.js";
import vendorSettlementService from "../services/vendorSettlementService.js";
import { logger } from "../utils/logger.js";
class SettlementController {

    async createSettlement(req, res, next) {
        try {
            checkValidation(req)
            const vendor = await vendorRepo.getVendorByCode(req.body.code);
            if (!vendor) {
                throw new CustomError(404, 'Vendor does not exist')
            }
            if (req.body.method === "INTERNAL_BANK_TRANSFER" || "INTERNAL_QR_TRANSFER" ) {
                 const utrforbank =await botResponseRepo.getBotResponseByUTR(req.body.refrence_id);
                  if (utrforbank) { 
                    await botResponseRepo.updateBotResponseToInternalBank(utrforbank.id);
                   }  
            }
            delete req.body.code;
            const data = await vendorSettlementService.createSettlement({
                ...req.body,
                status: "INITIATED",
                vendor_id: vendor.id,
            });
            return DefaultResponse(res, 201, "Settlement created successfully");
        } catch (err) {
            logger.info(err);
            next(err);
        }
    }
    // INTERNAL_BANK_TRANSFER INTERNAL_QR_TRANSFER
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

            const user = await userRepo.getUserByUsernameRepo(req.user.userName)

            let Codes;

            if (user?.role !== "ADMIN"  && !code) {
                Codes = user?.vendor_code
            }
            else {
                Codes = code
            }

            const take = Number(qTake) || 20;
            const skip = take * (Number(page || 1) - 1);
            const data = await vendorSettlementService.getSettlement(skip, take, parseInt(id), Codes, status, amount, acc_no, method, refrence_id);
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
            const data = await vendorSettlementService.updateSettlement(req.params.id, payload);
            return DefaultResponse(res, 200, "Settlement Updated!", data);
        } catch (err) {
            logger.info(err);
            next(err);
        }
    }
}

export default new SettlementController()