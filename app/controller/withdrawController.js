import merchantRepo from "../repository/merchantRepo.js";
import withdrawService from "../services/withdrawService.js";
import { checkValidation } from "../helper/validationHelper.js";
import { DefaultResponse } from "../helper/customResponse.js";
import { getAmountFromPerc } from "../helper/utils.js";
import { v4 as uuidv4 } from "uuid";
import axios from "axios";
import { CustomError, customError } from "../middlewares/errorHandler.js";
import { logger } from "../utils/logger.js";
import crypto from 'crypto';
import config from "../../config.js";
import bankAccountRepo from "../repository/bankAccountRepo.js";
import generatePrefix from "../utils/generateFormattedStrinf.js";
import { response } from "express";
// import apis from '@api/apis';

class WithdrawController {

  constructor() {
    this.updateWithdraw = this.updateWithdraw.bind(this);
    this.createEkoWithdraw = this.createEkoWithdraw.bind(this);
    this.ekoPayoutStatus = this.ekoPayoutStatus.bind(this);
  }

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

  async activateEkoService(req, res) {

    const key = config?.ekoAccessKey;
    const encodedKey = Buffer.from(key).toString('base64');

    const secretKeyTimestamp = Date.now();
    const secretKey = crypto.createHmac('sha256', encodedKey).update(secretKeyTimestamp.toString()).digest('base64');

    // may be in future this will need
    // console.log('Secret Key:', secretKey);
    // console.log('Secret Timestamp:', secretKeyTimestamp);

    const encodedParams = new URLSearchParams();
    encodedParams.set('service_code', config?.ekoServiceCode);
    encodedParams.set('user_code', config?.ekoUserCode);
    encodedParams.set('initiator_id', config?.ekoInitiatorId);  

    const url = config?.ekoPaymentsActivateUrl;
    const options = {
      method: 'PUT',
      headers: {
        accept: 'application/json',
        developer_key: config?.ekoDeveloperKey,
        'secret-key': secretKey,
        'secret-key-timestamp': secretKeyTimestamp,
        'content-type': 'application/x-www-form-urlencoded'
      },
      body: encodedParams
  };
    try{
      const response = await fetch(url, options);
      const responseText = await response.text();

      let parsedData;
      try {
        parsedData = JSON.parse(responseText);
      } catch (err) {
        logger.error(err);
        parsedData = responseText;
      }

      return DefaultResponse(
      res,
      response.ok ? 200 : response.status,
      parsedData?.message,
      parsedData
    );
      
    }catch (error){
      logger.error(error)
    }
  }

  async createEkoWithdraw(payload, res) {
    const client_ref_id = generatePrefix(payload?.user_id);

    const newObj = {
      amount: payload?.amount, 
      client_ref_id,
      recipient_name : payload?.acc_holder_name, 
      ifsc: payload?.ifsc_code, 
      account: payload?.acc_no, 
      sender_name: "TrustPay",
    }

    const key = config?.ekoAccessKey;
    const encodedKey = Buffer.from(key).toString('base64');

    const secretKeyTimestamp = Date.now();
    const secretKey = crypto.createHmac('sha256', encodedKey).update(secretKeyTimestamp.toString()).digest('base64');

    const encodedParams = new URLSearchParams();
    encodedParams.set('service_code', config?.ekoServiceCode);
    encodedParams.set('initiator_id', config?.ekoInitiatorId); 
    encodedParams.set('amount', newObj.amount);
    encodedParams.set('payment_mode', '5');
    encodedParams.set('client_ref_id', newObj.client_ref_id);
    encodedParams.set('recipient_name', newObj.recipient_name);
    encodedParams.set('ifsc', newObj.ifsc);
    encodedParams.set('account', newObj.account);
    encodedParams.set('sender_name', newObj.sender_name);
    encodedParams.set('source', 'NEWCONNECT');
    encodedParams.set('tag', 'Logistic');
    encodedParams.set('beneficiary_account_type', 1); 
    
    const url = `${config?.ekoPaymentsInitiateUrl}:${config?.ekoUserCode}/settlement`;
    const options = {
      method: 'POST',
      headers: {
        accept: 'application/json',
        developer_key: config?.ekoDeveloperKey,
        'secret-key': secretKey,
        'secret-key-timestamp': secretKeyTimestamp,
        'content-type': 'application/x-www-form-urlencoded'
      },
      body: encodedParams
  };

    try{
      const response = await fetch(url, options);
      const responseText = await response.text();

      let parsedData;
      try {
        parsedData = JSON.parse(responseText);
      } catch (err) {
        logger.error(err);
        parsedData = responseText;
      }
      return parsedData;
    //   return DefaultResponse(
    //   res,
    //   response.status,
    //   parsedData?.message,
    //   parsedData
    // );
    } catch (error) {
      logger.error(error);
    }
  }

  async ekoPayoutStatus(id, res) {
    // const {id} = req.params; // here id wil be client_ref_id (unique)
    const key = config?.ekoAccessKey;
    const encodedKey = Buffer.from(key).toString('base64');

    const secretKeyTimestamp = Date.now();
    const secretKey = crypto.createHmac('sha256', encodedKey).update(secretKeyTimestamp.toString()).digest('base64');

    const url = `${config?.ekoPaymentsStatusUrl}${id}?initiator_id=${config?.ekoInitiatorId}`;
    const options = {
      method: 'GET',
      headers: {
        accept: 'application/json',
        developer_key: config?.ekoDeveloperKey,
        'secret-key': secretKey,
        'secret-key-timestamp': secretKeyTimestamp,
        'content-type': 'application/x-www-form-urlencoded'
      },
  };

    try{
      const response = await fetch(url, options);
      const responseText = await response.text();

      let parsedData;
      try {
        parsedData = JSON.parse(responseText);
      } catch (err) {
        logger.error(err);
        parsedData = responseText;
      }
      return parsedData;
    //   return DefaultResponse(
    //   res,
    //   response.ok ? 200 : response.status,
    //   parsedData?.message,
    //   parsedData
    // );
    } catch (error) {
      logger.error(error);
    }
  }

  async ekoWalletBalanceEnquiry(req, res) {
    const key = config?.ekoAccessKey;
    const encodedKey = Buffer.from(key).toString('base64');

    const secretKeyTimestamp = Date.now();
    const secretKey = crypto.createHmac('sha256', encodedKey).update(secretKeyTimestamp.toString()).digest('base64');

    const url = `${config?.ekoWalletBalanceEnquiryUrl}:${config?.ekoRegisteredMobileNo}/balance?initiator_id=${config?.ekoInitiatorId}&user_code=${config?.ekoUserCode}`;
    const options = {
      method: 'GET',
      headers: {
        accept: 'application/json',
        developer_key: config?.ekoDeveloperKey,
        'secret-key': secretKey,
        'secret-key-timestamp': secretKeyTimestamp,
        'content-type': 'application/x-www-form-urlencoded'
      },
  };

    try{
      const response = await fetch(url, options);
      const responseText = await response.text();

      let parsedData;
      try {
        parsedData = JSON.parse(responseText);
      } catch (err) {
        logger.error(err);
        parsedData = responseText;
      }

      return DefaultResponse(
      res,
      response.ok ? 200 : response.status,
      parsedData?.message,
      parsedData
    );
    } catch (error) {
      logger.error(error);
    }
  }

  async ekoTransactionStatusCallback(req, res, next) {
    const payload = req.body;
    const {
      tx_status,
      amount,
      payment_mode,
      txstatus_desc,
      fee,
      gst,
      sender_name,
      tid,
      beneficiary_account_type,
      client_ref_id,
      old_tx_status,
      old_tx_status_desc,
      bank_ref_num,
      ifsc,
      recipient_name,
      account,
      timestamp,
    } = payload;
    try {
      const parsedData = {
        tx_status,
        amount,
        payment_mode,
        txstatus_desc,
        fee,
        gst,
        sender_name,
        tid,
        client_ref_id,
        old_tx_status,
        old_tx_status_desc,
        bank_ref_num,
        ifsc,
        recipient_name,
        account,
        timestamp,
      };

      const data = await this.updateWithdraw(req, res)
      logger.log(`Transaction ID: ${tid}, Status: ${txstatus_desc}, Amount: ${amount}`);
      console.log(parsedData)
      return res.status(200).send('Success');
    } catch (err) {
      next(err);
    }
  }

  async checkPayoutStatus(req, res, next) {
    try {
      checkValidation(req);
      const { payoutId, merchantCode, merchantOrderId } = req.body;

      if (!merchantCode && !merchantOrderId) {
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
      
      if (!data) {
        logger.info('Payout not found');
        return DefaultResponse(res, 404, "Payout not found");
      }
      else {
        logger.info('Checking Payout Status', {
          status: data.status,
          // data: data.data,
        })
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
        method,
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
        method,
        Number(sno),
        from_bank,
        commission,
        utr_id,
        acc_holder_name
      );
      logger.info('Get All Payout', {
        status: data.status,
        // data: data.data,
      })
      return DefaultResponse(res, 200, "Payout fetched successfully!", data);
    } catch (err) {
      logger.info(err);
    }
  }

  async updateWithdraw(req, res, next) {
    try {
      const payload = {
        ...req.body,
      };
      if (req.body.utr_id) {
        payload.status = "SUCCESS";
        payload.approved_at = new Date()
      }
      if (req.body.rejected_reason) {
        // TODO: confirm the status
        payload.status = "REJECTED";
        payload.rejected_reason = req.body.rejected_reason;
        payload.rejected_at = new Date()
      }
      if ([req.body.status].includes("INITIATED")) {
        payload.utr_id = "";
        payload.rejected_reason = "";
      }
      if (req.body.method == "accure") {
        // delete payload.method;
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

      const singleWithdrawData = await withdrawService.getWithdrawById(req.params.id);

      if (req?.body?.method === 'eko') {
        try {
            const ekoResponse = await this.createEkoWithdraw(singleWithdrawData, res);
    
            if (ekoResponse?.status === 0) {
                payload.status = 'SUCCESS';
                payload.approved_at = new Date();
                payload.utr_id = ekoResponse?.data?.tid;
            } else {
                const getStatus = await this.ekoPayoutStatus(ekoResponse?.data?.tid);    
    
                if (getStatus?.status === 0) {
                    payload.status = getStatus?.data?.txstatus_desc?.toUpperCase();
                    payload.approved_at = new Date();
                    payload.utr_id = getStatus?.data?.tid;
                } else {
                    payload.status = 'REVERSED';
                    payload.rejected_reason = getStatus?.message;
                    logger.error(getStatus?.message);
                }
            }
            } catch (error) {
                logger.error('Error processing Eko method:', error);
            }
        }
    
      const merchant = await merchantRepo.getMerchantById(singleWithdrawData.merchant_id);
      const data = await withdrawService.updateWithdraw(req.params.id, payload);
      logger.info('Payout Updated', {
        status: data.status,
        // data: data.data,
      })

      if (payload.from_bank) {
        const bankAccountRes = await bankAccountRepo.getBankNickName(data.from_bank);
  
        await bankAccountRepo.updatePayoutBankAccountBalance(
          bankAccountRes.id,
          parseFloat(data.amount),
          payload.status
        );
      }

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
      logger.info(err)
    }
  }

  // Reports
  async getAllPayOutDataWithRange(req, res, next) {
    try {
      checkValidation(req);
      let { merchantCode, status, startDate, endDate, includeSubMerchant } = req.body;

      if (!merchantCode) {
        merchantCode = [];
      } else if (typeof merchantCode === "string") {
        merchantCode = [merchantCode];
      }

      if(!includeSubMerchant) {
        let allNewMerchantCodes = [];
        for (const code of merchantCode) {
          const merchantData = await merchantRepo.getMerchantByCode(code);
          if (merchantData) {
            allNewMerchantCodes = [
              ...allNewMerchantCodes,
              ...(Array.isArray(merchantData.child_code) ? merchantData.child_code : []),
              merchantData.code,
            ];
          }
        }

        const payOutDataRes = await withdrawService.getAllPayOutDataWithRange(
          allNewMerchantCodes,
          status,
          startDate,
          endDate
        );
        logger.info('Get all payout with range', {
          status: payOutDataRes.status,
          // data: payOutDataRes.data,
        })
  
        return DefaultResponse(
          res,
          200,
          "Payout data fetched successfully",
          payOutDataRes
        );
      } else {
        const payOutDataRes = await withdrawService.getAllPayOutDataWithRange(
          merchantCode,
          status,
          startDate,
          endDate
        );
        logger.info('Get all payout with range', {
          status: payOutDataRes.status,
          // data: payOutDataRes.data,
        })
  
        return DefaultResponse(
          res,
          200,
          "Payout data fetched successfully",
          payOutDataRes
        );
      }
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
        data: result,
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
