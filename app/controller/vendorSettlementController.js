import { DefaultResponse } from "../helper/customResponse.js"
import { checkValidation } from "../helper/validationHelper.js";
import { CustomError } from "../models/customError.js";
import userRepo from "../repository/userRepo.js";
import vendorRepo from "../repository/vendorRepo.js";
import botResponseRepo from "../repository/botResponseRepo.js";
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
            delete req.body.code;
            let data;
            if (req.body.method === "INTERNAL_QR_TRANSFER" || req.body.method === "INTERNAL_BANK_TRANSFER") {
                const botRes = await botResponseRepo.getBotResDataByUtrAndAmount(req.body.refrence_id, req.body.amount.replace("-", ""));
                if (botRes || botRes !== null) {
                    data = await vendorSettlementService.createSettlement({
                        ...req.body,
                        status: "INITIATED",
                        vendor_id: vendor.id,
                    });
                    if (data) {
                        const payload = {
                            status: "SUCCESS"
                        }
                        await vendorSettlementService.updateSettlement(data.id, payload);
                        const apiData = {
                            status: "/internalTransfer",
                        }
                        await botResponseRepo.updateBotResponseByUtrToInternalTransfer(botRes.id, apiData);
                    }
                }
                else {
                    throw new CustomError(400, 'Invalid reference id or amount')
                }
            }
            else {
                data = await vendorSettlementService.createSettlement({
                    ...req.body,
                    status: "INITIATED",
                    vendor_id: vendor.id,
                });
            }
            return DefaultResponse(res, 201, "Settlement created successfully");
        } catch (err) {
            console.log(err)
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
                refrence_id
            } = req.query;

            const user = await userRepo.getUserByUsernameRepo(req.user.userName)

            let Codes;


            if (user?.role !== "ADMIN" && !code) {
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
            if (req.body.status == "INITIATED") {
                const take = 20;
                const skip = take * (1 - 1);
                const settlement = await vendorSettlementService.getSettlement(skip, take, parseInt(req.params.id))
                if (settlement.data[0].method === "INTERNAL_QR_TRANSFER" || settlement.data[0].method === "INTERNAL_BANK_TRANSFER") {
                    const botRes = await botResponseRepo.getBotResDataByInternalTransfer(settlement.data[0].refrence_id, String(settlement.data[0].amount).replace("-", ""));
                    if (botRes || botRes!== null) {
                        const apiData = {
                            status: "/success",
                        }
                        await botResponseRepo.updateBotResponseByUtrToInternalTransfer(botRes.id, apiData);
                    }
                }
            }
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