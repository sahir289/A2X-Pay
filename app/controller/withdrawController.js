import merchantRepo from "../repository/merchantRepo.js";
import withdrawService from "../services/withdrawService.js";
import { checkValidation } from "../helper/validationHelper.js";
import { DefaultResponse } from "../helper/customResponse.js";
import { getAmountFromPerc } from "../helper/utils.js";
import { v4 as uuidv4 } from "uuid";
import axios from "axios";

class WithdrawController {
  async createWithdraw(req, res, next) {
    try {
      checkValidation(req);
      const merchant = await merchantRepo.getMerchantByCode(req.body.code);
      if (!merchant) {
        throw new CustomError(404, "Merchant does not exist");
      }
      delete req.body.code;
      const data = await withdrawService.createWithdraw({
        ...req.body,
        status: "INITIATED",
        merchant_id: merchant.id,
        payout_commision: getAmountFromPerc(
          merchant.payin_commission,
          req.body.amount
        ),
        currency: "INR",
      });
      return DefaultResponse(res, 201, "Payout created successfully");
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

      if (!merchantCode) {
        return DefaultResponse(res, 404, {
          status: "error",
          error: "API key / code not found",
        });
      }

      const data = await withdrawService.checkPayoutStatus(
        payoutId,
        merchantCode,
        merchantOrderId
      );

      if (!data) {
        return DefaultResponse(res, 404, "Payout not found");
      }

      // if (data.Merchant.max_payout < data.amount) {
      //   return DefaultResponse(res, 461, {
      //     status: "error",
      //     error: "Amount beyond payout limits",
      //   });
      // }

      // if (
      //   data.status !== "SUCCESS" ||
      //   data.status !== "FAILED" ||
      //   data.status !== "PENDING"
      // ) {
      //   return DefaultResponse(res, 400, {
      //     status: "error",
      //     error: "Invalid request. Data type mismatch or incomplete request",
      //   });
      // }

      if (data.is_notified) {
        const notifyData = {
          status: "success",
          merchantCode: data.Merchant.code,
          merchantOrderId: data.merchant_order_id,
          payinId: data.id,
          amount: data.amount,
        };
        try {
          // const notifyMerchant = await axios.post(data.notify_url, notifyData);
        } catch (error) { }
      }

      // if (data.status === "SUCCESS") {
      //   res.redirect(302, data.return_url);
      // }

      const response = {
        status: data.status,
        merchantOrderId: data.merchant_order_id,
        amount: data.amount,
        payoutId: data.id,
        // paymentId: uuidv4(),
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
        payout_commision,
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
        payout_commision,
        utr_id,
        acc_holder_name
      );
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
      
      const merchantPayoutUrl = merchant.payout_notify_url;
      if (merchantPayoutUrl !== null) {
        let merchantPayoutData = {
          merchantOrderId: singleWithdrawData.merchant_order_id,
          payoutId: req.params.id,
          amount: singleWithdrawData.amount,
          status: payload.status,
          // paymentId: payload.utr_id ? payload.utr_id : "",
        }
        // Payout notify
        // const response = await axios.post(`${merchantPayoutUrl}`, merchantPayoutData);
      }
      const data = await withdrawService.updateWithdraw(req.params.id, payload);
      return DefaultResponse(res, 200, "Payout Updated!", data);
    } catch (err) {
      next(err);
    }
  }

  async getAllPayOutDataWithRange(req, res, next) {
    try {
      checkValidation(req);
      const { merchantCode, status, startDate, endDate } = req.query;

      if (merchantCode == null) {
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
