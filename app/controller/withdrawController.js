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
import generatePrefix from "../utils/generateFormattedString.js";
import payInServices from "../services/payInServices.js";
import { response } from "express";
// import apis from '@api/apis';

class WithdrawController {

  constructor() {
    this.updateWithdraw = this.updateWithdraw.bind(this);
    this.createEkoWithdraw = this.createEkoWithdraw.bind(this);
    this.ekoPayoutStatus = this.ekoPayoutStatus.bind(this);
    this.ekoWalletBalanceEnquiryInternally = this.ekoWalletBalanceEnquiryInternally.bind(this);
    this.createWithdraw = this.createWithdraw.bind(this);
  }

  async createWithdraw(req, res, next) {
    const restrictedMerchants = ['DHM','APPLE','CB','RK','MafiaMundeer','BERU','luna','Bita','treX', 'paycord', 'paycord-live', 'paycord-live-2', 'paycord-live-intent'];
    try {
      checkValidation(req);
      const { user_id, bank_name, acc_no, acc_holder_name, ifsc_code, amount, vendor_code, merchant_order_id, code } = req.body;
      const num = Number(amount);
      
      if (restrictedMerchants.includes(code)) {
        const getMerchantNetBalance = await payInServices.getMerchantsNetBalance([code]);
        if (getMerchantNetBalance.totalNetBalance < num) {
          return DefaultResponse(res, 401, `Insufficient Balance to create Payout`);
        }
        const ekoBalanceEnquiry = await this.ekoWalletBalanceEnquiryInternally();
        if (Number(ekoBalanceEnquiry.data.balance) < num) {
          return DefaultResponse(res, 501, "Insufficient Balance in Wallet");
        }
      }
      const merchant = await merchantRepo.getMerchantByCode(code);
      if (!merchant) {
        throw new CustomError(404, "Merchant does not exist");
      }
      
      if (req.headers["x-api-key"] !== merchant.api_key) {
        throw new CustomError(404, "Enter valid Api key");
      }
      delete req.body.code;
      const ifsc = ifsc_code.toUpperCase();
      
      const data = await withdrawService.createWithdraw({
        user_id,
        bank_name,
        acc_no,
        acc_holder_name,
        ifsc_code: ifsc,
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
      logger.info(err);
      next(err);
    }
  }

  async createBlazepeWithdraw(payload, merchantRefId) {
    const newObj = {
      amount: payload?.amount, 
      name : payload?.acc_holder_name, 
      mode: "imps", 
      ifsc: payload?.ifsc_code, 
      bankAccount: payload?.acc_no,
      notifyUrl: `${config.ourUrlForGettingCallbackFromBlazePe}${payload.id}`,
      merchantRefId,
    }
    const merchant_code = config?.merchantCodeBlazePay;
    const merchant_secret = config?.merchantSecretBlazePay;

    const url = `${config?.blazePePaymentsInitiateUrl}`;
    let newConfig = {
      method: 'post',
      maxBodyLength: Infinity,
      url: url,
      headers: { 
        'merchant_code': merchant_code, 
        'merchant_secret':  merchant_secret, 
        'Content-Type': 'application/json'
      },
      data : JSON.stringify(newObj)
    };

    try {
      const response = await axios.request(newConfig);
      const data = response?.data;
      return data;
    } catch (error) {
        logger.error('Error processing BlazePe payout:', error.message);
        throw new CustomError(401, "Error processing BlazePe payout");
    }
  };

  async checkBlazepePayoutStatus(merchantRefId) {
    const merchant_code = config?.merchantCodeBlazePay;
    const merchant_secret = config?.merchantSecretBlazePay;

    const url = `${config?.blazePeGetPayoutStatusUrl}${merchantRefId}`;
    let newConfig = {
      method: 'get',
      url: url,
      headers: { 
        'merchant_code': merchant_code, 
        'merchant_secret':  merchant_secret, 
        'Content-Type': 'application/json'
      },
    };

    try {
      const response = await axios.request(newConfig)
      const data = await response?.data;
      return data;  
    } catch (error) {
        logger.error('Error getting BlazePe payout status:', error.message);
        throw new CustomError(401, "Error getting BlazePe payout status");
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

  async createEkoWithdraw(payload, client_ref_id) {

    const newObj = {
      amount: payload?.amount, 
      client_ref_id,
      recipient_name : payload?.acc_holder_name, 
      ifsc: payload?.ifsc_code, 
      account: payload?.acc_no, 
      sender_name: "TrustPay"
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

    const url = `${config?.ekoPaymentsStatusUrlByClientRefId}${id}?initiator_id=${config?.ekoInitiatorId}`;
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

  async ekoWalletBalanceEnquiryInternally() {
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

  async ekoTransactionStatusCallback(req, res) {
    const payload = req.body;
    const tid = payload.tid;

    try {
      const singleWithdrawData = await withdrawService.getWithdrawByTid(tid);
      if(!singleWithdrawData){
        return DefaultResponse(res, 404, "Payment not found");
      }
      const updatedData = {
        status: payload.txstatus_desc.toUpperCase() == 'SUCCESS' ? payload.txstatus_desc.toUpperCase() : 'REJECTED',
        amount: Number(payload.amount),
        utr_id: payload.tid ? String(payload.tid): "",
        approved_at: payload.status == 'SUCCESS'? new Date() : null,
        rejected_at: payload.status != 'SUCCESS'? new Date() : null,
      }

      const merchant = await merchantRepo.getMerchantById(singleWithdrawData.merchant_id);
      const data = await withdrawService.updateWithdraw(singleWithdrawData.id, updatedData);
      logger.info('Payout Updated by Eko callback', {
        status: data.status,
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
          payoutId: singleWithdrawData.id,
          amount: singleWithdrawData.amount,
          status: payload.status,
          utr_id: payload.utr ? payload.utr : "",
        }
        try {
          logger.info('Sending notification to merchant', { notify_url: merchantPayoutUrl, notify_data: merchantPayoutData });
          const response = await axios.post(merchantPayoutUrl, merchantPayoutData);
          logger.info('Notification sent successfully', {
            status: response.status,
            data: response.data,
          })
        } catch (error) {
          logger.error("Error notifying merchant at payout URL:", error.message)
          new CustomError(400, "Failed to notify merchant about payout"); // Or handle in a different way
        }
      }
      return DefaultResponse(res, 200, "Callback Received Successfully");
    } catch (err) {
      logger.error("getting error while updating payout", err);
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
      logger.info('Payout not found', err);
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
        includeSubMerchant,
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
        acc_holder_name,
        includeSubMerchant
      );
      logger.info('Get All Payout', {
        status: data.status,
        // data: data.data,
      })
      return DefaultResponse(res, 200, "Payout fetched successfully!", data);
    } catch (err) {
      logger.info(err);
      next(err);
    }
  }

  async updateWithdraw(req, res, next) {
    try {
      const payload = {
        ...req.body,
      };
      if (req.body.utr_id && !req.body.status) {
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
              const client_ref_id = Math.floor(Date.now() / 1000);
              const ekoResponse = await this.createEkoWithdraw(singleWithdrawData, client_ref_id);
              if (ekoResponse?.status === 0) {
                  // added == instead of ===, due the type of txstatus_desc is not string
                  payload.status = ekoResponse?.data?.txstatus_desc?.toUpperCase() == 'SUCCESS'? ekoResponse?.data?.txstatus_desc?.toUpperCase(): 'PENDING';
                  payload.approved_at = ekoResponse?.data?.txstatus_desc?.toUpperCase() == 'SUCCESS'? new Date() : null;
                  payload.utr_id = ekoResponse?.data?.tid;

                  logger.info(`Payment initiated: ${ekoResponse?.message}`, ekoResponse?.message);
              } else {
                let getEkoPayoutStatus;
                if(ekoResponse.status === 1328){
                  getEkoPayoutStatus = await this.ekoPayoutStatus(client_ref_id);
                }
                  payload.status = 'REJECTED';
                  payload.rejected_reason = ekoResponse?.message;
                  payload.rejected_at = new Date();
                  payload.utr_id = getEkoPayoutStatus ? getEkoPayoutStatus?.data.tid : null;
                  logger.error(`Payment rejected by eko due to ${ekoResponse?.message}`, ekoResponse?.message);
              }
            } catch (error) {
                logger.error('Error processing Eko method:', error);
            }
        }

      if(req.body?.method === 'blazepe'){
        payload.method = req.body?.method;
        try {
          const merchantRefId = generatePrefix(req.body?.method);
          const blazePeResponse = await this.createBlazepeWithdraw(singleWithdrawData, merchantRefId);
          if (blazePeResponse?.success === true) {
              payload.status = 'PENDING';
              payload.utr_id = merchantRefId;
              logger.info(`New payout with merchantRefId: ${merchantRefId} has been created`, blazePeResponse?.message);
          } else if(blazePeResponse?.success === false){
            logger.error(`New payout with merchantRefId: ${merchantRefId} has been failed to initiate`,blazePeResponse?.message);

            const getStatus = await this.checkBlazepePayoutStatus(merchantRefId); 
    
                if (getStatus?.status === 'REFUNDED' || getStatus?.status === 'REVERSED') {
                    payload.status = 'REJECTED';
                    payload.rejected_reason = getStatus?.message;
                    payload.rejected_at = new Date();
                    // payload.utr_id = getStatus?.utr;
                    logger.error(`Status is ${payload.status}`, getStatus?.message);
                } else if(getStatus?.status === 'SUCCESS'){
                  payload.status = getStatus?.status.toUpperCase();
                  payload.approved_at = new Date();
                  // payload.utr_id = getStatus?.utr;
                  logger.info(`Status is ${payload.status}`, getStatus?.message);
                } else {
                    payload.status = getStatus?.status? getStatus?.status.toUpperCase() : 'REJECTED';
                    payload.rejected_reason = getStatus?.message;
                    payload.rejected_at = new Date();
                    logger.error(`Status is ${payload.status}`, getStatus?.message);
                }
          }
          } catch (error) {
              logger.error('Error processing BlazePe method:', error);
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
          logger.info('Notification sent successfully', {
            status: response.status,
            data: response.data,
          })
          // Log response or take any action based on response
        } catch (error) {
          // Handle error for invalid/unreachable merchant URL
          console.error("Error notifying merchant at payout URL:", error.message);
          logger.error("Error notifying merchant at payout URL:", error.message)

          // Call your custom error function if necessary
          new CustomError(400, "Failed to notify merchant about payout"); // Or handle in a different way
        }
      }
      return DefaultResponse(res, 200, "Payout Updated!", data);
    } catch (err) {
      console.log(err);
      logger.info(err);
      next(err);
    }
  }

  async updateBlazePePayoutStatus(req, res) {
    try {
      const payload = req.body;
      const { id } = req.params;
      const singleWithdrawData = await withdrawService.getWithdrawById(id);
      if(!singleWithdrawData){
        return DefaultResponse(res, 404, "withdrawal not found");
      }
      const updatedData = {
        status: payload.status,
        amount: Number(payload.amount),
        utr_id: payload.utr ? payload.utr: "",
        approved_at: payload.status === 'SUCCESS'? new Date() : null,
      }

      const merchant = await merchantRepo.getMerchantById(singleWithdrawData.merchant_id);
      const data = await withdrawService.updateWithdraw(id, updatedData);
      logger.info('Payout Updated by blazePe notify callback', {
        status: data.status,
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
          payoutId: id,
          amount: singleWithdrawData.amount,
          status: payload.status,
          utr_id: payload.utr ? payload.utr : "",
        }
        try {
          logger.info('Sending notification to merchant', { notify_url: merchantPayoutUrl, notify_data: merchantPayoutData });
          const response = await axios.post(merchantPayoutUrl, merchantPayoutData);
          logger.info('Notification sent successfully', {
            status: response.status,
            data: response.data,
          })
        } catch (error) {
          logger.error("Error notifying merchant at payout URL:", error.message)
          new CustomError(400, "Failed to notify merchant about payout"); // Or handle in a different way
        }
      }
      return DefaultResponse(res, 200, "Payout Updated by BlazePe Notify Callback", data);
    } catch (err) {
      logger.info(err)
    }
  }

  // Reports
  async getAllPayOutDataWithRange(req, res, next) {
    try {
      checkValidation(req);
      let { merchantCode, status, startDate, endDate, method, includeSubMerchant } = req.body;

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
          endDate,
          method
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
          endDate,
          method
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
      logger.info(error);
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
      logger.info(err);
      next(err);
    }
  }
}

export default new WithdrawController();
