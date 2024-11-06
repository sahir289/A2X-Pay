import merchantRepo from "../repository/merchantRepo.js";
import withdrawService from "../services/withdrawService.js";
import { checkValidation } from "../helper/validationHelper.js";
import { DefaultResponse } from "../helper/customResponse.js";
import { getAmountFromPerc } from "../helper/utils.js";
import { v4 as uuidv4 } from "uuid";
import axios from "axios";
import { CustomError } from "../middlewares/errorHandler.js";
import { logger } from "../utils/logger.js";

class WithdrawController {
  async createWithdraw(req, res, next) {
    try {
      checkValidation(req);
      const { user_id, bank_name, acc_no, acc_holder_name, ifsc_code, amount, vendor_code, merchant_order_id } = req.body;
      const merchant = await merchantRepo.getMerchantByCode(req.body.code);
      if (!merchant) {
        throw new CustomError(404, "Merchant does not exist");
      }
      if (req.headers["x-api-key"] !== merchant.api_key) {
        throw new CustomError(404, "Enter valid Api key");
      }
      delete req.body.code;

      const data = await withdrawService.createWithdraw({
        user_id,
        bank_name,
        acc_no,
        acc_holder_name,
        ifsc_code,
        amount,
        vendor_code,
        status: "INITIATED",
        merchant_id: merchant.id,
        merchant_order_id: merchant_order_id,
        payout_commision: getAmountFromPerc(
          merchant.payout_commission,
          req.body.amount
        ),
        currency: "INR",
      });
      logger.info('Payout created successfully', {
        status: data.status,
        data: data.data,
      })
      return DefaultResponse(res, 201, "Payout created successfully", { merchantOrderId: data?.merchant_order_id, payoutId: data?.id, amount: data?.amount });
    } catch (err) {
      next(err);
    }
  }

  async checkPayoutStatus(req, res, next) {
    try {
      checkValidation(req);
      const { payoutId, merchantCode, merchantOrderId } = req.body;

      if (!payoutId && !merchantCode && !merchantOrderId) {
        return DefaultResponse(res, 400, {
          status: "error",
          error: "Invalid request. Data type mismatch or incomplete request",
        });
      }
      const merchant = await merchantRepo.getMerchantByCode(merchantCode);
      if (!merchant) {
        throw new CustomError(404, "Merchant does not exist");
      }
      if (req.headers["x-api-key"] !== merchant.api_key) {
        throw new CustomError(404, "Enter valid Api key");
      }

      const data = await withdrawService.checkPayoutStatus(
        payoutId,
        merchantCode,
        merchantOrderId
      );
      logger.info('Payout Status', {
        status: data.status,
        data: data.data,
      })

      if (!data) {
        return DefaultResponse(res, 404, "Payout not found");
      }

      const response = {
        status: data.status,
        merchantOrderId: data.merchant_order_id,
        amount: data.amount,
        payoutId: data.id,
        utr_id: data?.status === "SUCCESS" ? data?.utr_id : ""
      };

      return DefaultResponse(
        res,
        200,
        "Payout status fetched successfully",
        response
      );
    } catch (err) {
      next(err);
    }
  }

  async getWithdraw(req, res, next) {
    try {
      checkValidation(req);
      const {
        page,
        take: qTake,
        id,
        code,
        vendorCode,
        status,
        amount,
        acc_no,
        merchant_order_id,
        user_id,
        sno,
        from_bank,
        commission,
        utr_id,
        acc_holder_name,
      } = req.query;
      const take = Number(qTake) || 20;
      const skip = take * (Number(page || 1) - 1);
      const data = await withdrawService.getWithdraw(
        skip,
        take,
        id,
        code,
        vendorCode,
        status,
        amount,
        acc_no,
        merchant_order_id,
        user_id,
        Number(sno),
        from_bank,
        commission,
        utr_id,
        acc_holder_name
      );
      logger.info('Get All Payout', {
        status: data.status,
        data: data.data,
      })
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
      if (req.body.utr_id) {
        payload.status = "SUCCESS";
      }
      if (req.body.rejected_reason) {
        // TODO: confirm the status
        payload.status = "REJECTED";
        payload.rejected_reason = req.body.rejected_reason;
      }
      if ([req.body.status].includes("INITIATED")) {
        payload.utr_id = "";
        payload.rejected_reason = "";
      }
      if (req.body.method == "accure") {
        delete payload.method;
        // const { ACCURE_SECRET  } = process.env;
        // await axios.post("http://www.example.com", {})
        // .then(res=>{
        //     payload.status = "SUCCESS";
        //     // TODO: check response from accure and extracct utr_id
        //     payload.utr_id = res.data.utr_id;
        // })
        // .catch(err=>{
        //     payload.status = "REVERSED";
        // })
      }

      // Created payout callback feature
      const singleWithdrawData = await withdrawService.getWithdrawById(req.params.id);
      const merchant = await merchantRepo.getMerchantById(singleWithdrawData.merchant_id);
      const data = await withdrawService.updateWithdraw(req.params.id, payload);
      logger.info('Payout Updated', {
        status: data.status,
        data: data.data,
      })

      const merchantPayoutUrl = merchant.payout_notify_url;
      if (merchantPayoutUrl !== null) {
        let merchantPayoutData = {
          code:merchant.code,
          merchantOrderId: singleWithdrawData.merchant_order_id,
          payoutId: req.params.id,
          amount: singleWithdrawData.amount,
          status: payload.status,
          utr_id: payload.utr_id ? payload.utr_id : "",
        }
        try {
          // Payout notify
          logger.info('Sending notification to merchant', { notify_url: merchantPayoutUrl, notify_data: merchantPayoutData });
          const response = await axios.post(merchantPayoutUrl, merchantPayoutData);
          logger.info('Notification to merchant sent Successfully', {
            status: response.status,
            data: response.data,
          })
          // Log response or take any action based on response
        } catch (error) {
          // Handle error for invalid/unreachable merchant URL
          console.error("Error notifying merchant at payout URL:", error.message);

          // Call your custom error function if necessary
          new CustomError(400, "Failed to notify merchant about payout"); // Or handle in a different way
        }
      }
      return DefaultResponse(res, 200, "Payout Updated!", data);
    } catch (err) {
      next(err);
    }
  }

  // Reports
  async getAllPayOutDataWithRange(req, res, next) {
    try {
      checkValidation(req);
      let { merchantCode, status, startDate, endDate } = req.body;

      if (!merchantCode) {
        merchantCode = [];
      } else if (typeof merchantCode === "string") {
        merchantCode = [merchantCode];
      }

      const payOutDataRes = await withdrawService.getAllPayOutDataWithRange(
        merchantCode,
        status,
        startDate,
        endDate
      );
      logger.info('Get all payout with range', {
        status: payOutDataRes.status,
        data: payOutDataRes.data,
      })

      return DefaultResponse(
        res,
        200,
        "Payout data fetched successfully",
        payOutDataRes
      );
    } catch (error) {
      next(error);
    }
  }

  async updateVendorCode(req, res, next) {
    try {
      checkValidation(req);

      const { vendorCode, withdrawId } = req.body;

      if (typeof vendorCode !== "string" || vendorCode.trim() === "") {
        return DefaultResponse(
          res,
          400,
          "Invalid vendorCode: must be a non-empty string"
        );
      }

      if (
        !Array.isArray(withdrawId) ||
        withdrawId.length === 0 ||
        !withdrawId.every((id) => typeof id === "string")
      ) {
        return DefaultResponse(
          res,
          400,
          "Invalid withdrawId: must be a non-empty array containing strings"
        );
      }

      const vendorCodeValue = vendorCode;
      const withdrawIds = withdrawId;

      const result = await withdrawService.updateVendorCodes(
        withdrawIds,
        vendorCodeValue
      );
      logger.info('Vendor Code Updated', {
        status: payOutDataRes.status,
        data: payOutDataRes.data,
      })

      return DefaultResponse(
        res,
        200,
        result.message || "Vendor code updated successfully"
      );
    } catch (err) {
      next(err);
    }
  }
}

export default new WithdrawController();
