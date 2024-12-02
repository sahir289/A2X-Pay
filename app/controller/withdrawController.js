import merchantRepo from "../repository/merchantRepo.js";
import withdrawService from "../services/withdrawService.js";
import { checkValidation } from "../helper/validationHelper.js";
import { DefaultResponse } from "../helper/customResponse.js";
import { getAmountFromPerc } from "../helper/utils.js";
import { v4 as uuidv4 } from "uuid";
import axios from "axios";
import { CustomError } from "../middlewares/errorHandler.js";
import { logger } from "../utils/logger.js";
import crypto from 'crypto';
// import apis from '@api/apis';

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

  async createBlazepeWithdraw(req, res) {
    const headers = req.headers;
    const body = req.body;

    if (!headers.merchant_code || !headers.merchant_secret) {
        return res.status(400).json({
            success: false,
            message: 'Missing required headers: merchant_code or merchant_secret',
        });
    }

    if (headers.merchant_secret !== process.env.MERCHANT_SECRET) {
        return res.status(401).json({
            success: false,
            message: 'Invalid merchant secret',
        });
    }

    const requiredFields = [
        'name',
        'phone',
        'bankAccount',
        'ifsc',
        'mode',
        'amount',
        'notifyUrl',
        'merchantRefId',
    ];

    for (const field of requiredFields) {
        if (!body[field]) {
            return res.status(400).json({
                success: false,
                message: `Missing required field: ${field}`,
            });
        }
    }

    try {
        const thirdPartyResponse = await axios.post('https://blazepe-api-url.com/api/m/payout', body, {
            headers: {
                merchant_code: headers.merchant_code,
                merchant_secret: headers.merchant_secret,
                'Content-Type': 'application/json',
            },
        });

        const data = thirdPartyResponse.data;

        // Check Response and Update Database
        if (data.success) {
            const {
                amount,
                payoutId,
                transferId,
                status,
                message,
                merchantRefId,
            } = data.data;

            //  will Update DB below

            // const response = await withdrawService.updateWithdraw()
            
            return DefaultResponse(
              res,
              200,
              "Payout status fetched successfully",
              data
            );
        } else {
            return res.status(400).json({
                success: false,
                message: 'Third-party API returned an error',
                error: data.message,
            });
        }
    } catch (error) {
        console.error('Error processing payout:', error.message);
        throw new CustomError(404, "Error processing payout");
    }
  };

  async checkBlazepePayoutStatus(req, res, next) {
    try {
      checkValidation(req);
      const headers = req.headers;

      if (!payoutId && !headers.merchantCode && !headers.merchantOrderId) {
        return DefaultResponse(res, 400, {
          status: "error",
          error: "Invalid request. Data type mismatch or incomplete request",
        });
      }
      const merchant = await merchantRepo.getMerchantByCode(headers.merchantCode);
      if (!merchant) {
        throw new CustomError(404, "Merchant does not exist");
      }
      if (req.headers["x-api-key"] !== merchant.api_key) {
        throw new CustomError(404, "Enter valid Api key");
      }

      const data = await withdrawService.checkPayoutStatus(
        payoutId,
        headers.merchantCode,
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

  async activateEkoService(req, res, next) {

    const secretKeyTimestamp = String(Date.now());
    const key = 'd2fe1d99-6298-4af2-8cc5-d97dcf46df30';
    const keyBuffer = Buffer.from(key, 'utf-8');
    const messageBuffer = Buffer.from(secretKeyTimestamp, 'utf-8');

    // Create an HMAC using SHA-256
    const hmac = crypto.createHmac('sha256', keyBuffer);
    hmac.update(messageBuffer);
    const dig = hmac.digest();

    // Encode the HMAC digest to Base64
    const secretKey = dig.toString('base64');

    console.log('Secret Key:', secretKey);
    console.log('Secret Timestamp:', secretKeyTimestamp);

    const encodedParams = new URLSearchParams();
    encodedParams.set('service_code', '45');
    encodedParams.set('user_code', '20810200');
    encodedParams.set('initiator_id', '9962981729');  
    encodedParams.set('service_code', '45');

    const url = 'https://staging.eko.in/ekoapi/v1/user/service/activate';
    const options = {
      method: 'PUT',
      headers: {
        accept: 'application/json',
        developer_key: 'becbbce45f79c6f5109f848acd540567',
        'secret-key': secretKey,
        'secret-key-timestamp': secretKeyTimestamp,
        'content-type': 'application/x-www-form-urlencoded'
      },
      body: encodedParams
  };
    try{
      console.log('before fetching');
      // const data = await fetch(url, options)
      const data = fetch(url, options)
      .then(res => res.json())
      .then(json => console.log(json))
      .catch(err => console.error(err));
      console.log(data, "after fetching'")
      return res.send(data);
      
    }catch (error){
      logger.error(error)
    }
  }

  async createEkoWithdraw(req, res, next){
    const {payload} = req.body;

    const secretKeyTimestamp = String(Date.now());
    const key = 'd2fe1d99-6298-4af2-8cc5-d97dcf46df30';
    const developer_key = 'becbbce45f79c6f5109f848acd540567';
    const keyBuffer = Buffer.from(key, 'utf-8');
    const messageBuffer = Buffer.from(secretKeyTimestamp, 'utf-8');

    // Create an HMAC using SHA-256
    const hmac = crypto.createHmac('sha256', keyBuffer);
    hmac.update(messageBuffer);
    const dig = hmac.digest();

    // Encode the HMAC digest to Base64
    const secretKey = dig.toString('base64');

    console.log('Secret Key:', secretKey);
    console.log('Secret Timestamp:', secretKeyTimestamp);

    try {

      apis.initiateFundTransfer({
        initiator_id: 'string',
        client_ref_id: 'string',
        service_code: 45,
        payment_mode: 0,
        recipient_name: 'string',
        account: 'string',
        ifsc: 'string',
        amount: 0,
        source: 'NEWCONNECT',
        sender_name: 'string',
        tag: 'string',
        latlong: 'string',
        beneficiary_account_type: 0
      }, {
        user_code: 'usercodewillcreate',
        developer_key: developer_key,
        'secret-key': secretKey,
        'secret-key-timestamp': secretKeyTimestamp
      })
        .then(({ data }) => console.log(data))
        .catch(err => console.error(err));

    } catch (error) {
      logger.error(error);
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
        if (req.headers["x-api-key"] !== merchant.public_api_key) {
          throw new CustomError(404, "Enter valid Api key");
        }
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
        approved_at = new Date()
      }
      if (req.body.rejected_reason) {
        // TODO: confirm the status
        payload.status = "REJECTED";
        payload.rejected_reason = req.body.rejected_reason;
        rejected_at = new Date()
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
