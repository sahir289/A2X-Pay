import { GetObjectCommand } from "@aws-sdk/client-s3";
import axios from "axios";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { v4 as uuidv4 } from "uuid";
import config from "../../config.js";
import { s3 } from "../helper/AwsS3.js";
import { streamToBase64 } from "../helper/StreamToBase64.js";
import { DefaultResponse } from "../helper/customResponse.js";
import {
  sendAlreadyConfirmedMessageTelegramBot,
  sendAmountDisputeMessageTelegramBot,
  sendBankMismatchMessageTelegramBot,
  sendCheckUTRHistoryTelegramMessage,
  sendErrorMessageNoDepositFoundTelegramBot,
  sendErrorMessageNoImageFoundTelegramBot,
  sendErrorMessageNoMerchantOrderIdFoundTelegramBot,
  sendErrorMessageTelegram,
  sendErrorMessageUtrMismatchTelegramBot,
  sendErrorMessageUtrNotFoundTelegramBot,
  sendErrorMessageUtrOrAmountNotFoundImgTelegramBot,
  sendMerchantOrderIDStatusDuplicateTelegramMessage,
  sendResetEntryTelegramMessage,
  sendSuccessMessageTelegram,
  sendTelegramMessage,
} from "../helper/sendTelegramMessages.js";
import { calculateCommission } from "../helper/utils.js";
import { checkValidation } from "../helper/validationHelper.js";
import { CustomError } from "../middlewares/errorHandler.js";
import bankAccountRepo from "../repository/bankAccountRepo.js";
import botResponseRepo from "../repository/botResponseRepo.js";
import merchantRepo from "../repository/merchantRepo.js";
import payInRepo from "../repository/payInRepo.js";
import payInServices from "../services/payInServices.js";
import { sendBankNotAssignedAlertTelegram } from "../helper/sendTelegramMessages.js";
import { logger } from "../utils/logger.js";

// Construct __dirname manually
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const processedMessages = new Set();

class PayInController {
  // To Generate Url
  async generatePayInUrl(req, res, next) {
    try {
      let payInData;

      const { code, user_id, merchant_order_id, ot, isTest, amount, returnUrl, ap } = req.query;
      // If query parameters are provided, use them
      const getMerchantApiKeyByCode = await merchantRepo.getMerchantByCode(
        code
      );

      if (!getMerchantApiKeyByCode) {
        throw new CustomError(404, "Merchant does not exist");
      }
      if (ap) {
        if (ap !== getMerchantApiKeyByCode.api_key) {
          throw new CustomError(404, "Enter valid Api key");
        }
      } else {
        if (req.headers["x-api-key"] !== getMerchantApiKeyByCode.api_key) {
          throw new CustomError(404, "Enter valid Api key");
        }
      }
      // if (returnUrl) {
      //   const data = {
      //     id: getMerchantApiKeyByCode.id,
      //     return_url: returnUrl
      //   }
      //   await merchantRepo.updateMerchantData(data);
      // }
      const bankAccountLinkRes = await bankAccountRepo.getMerchantBankById(getMerchantApiKeyByCode?.id);
      const payInBankAccountLinkRes = bankAccountLinkRes?.filter(payInBank => payInBank?.bankAccount?.bank_used_for === "payIn");
      const availableBankAccounts = payInBankAccountLinkRes?.filter(bank => (bank?.bankAccount?.is_bank === true || bank?.bankAccount?.is_qr === true) && bank?.bankAccount?.is_enabled === true);
      if (!availableBankAccounts || availableBankAccounts.length === 0) {
        // Send alert if no bank account is linked
        await sendBankNotAssignedAlertTelegram(
          config?.telegramBankAlertChatId,
          getMerchantApiKeyByCode,
          config?.telegramBotToken,
        );
        throw new CustomError(404, "Bank Account has not been linked with Merchant");
      }

      if (!merchant_order_id && ot) {
        payInData = {
          code: code,
          amount,
          api_key: getMerchantApiKeyByCode?.api_key,
          merchant_order_id: uuidv4(),
          user_id: user_id,
          return_url: returnUrl ? returnUrl : getMerchantApiKeyByCode?.return_url,
          // isTest:isTest
        };
        // Uncomment and use your service to generate PayIn URL
        const generatePayInUrlRes = await payInServices.generatePayInUrl(
          getMerchantApiKeyByCode,
          payInData,
          bankAccountLinkRes[0] // to add the bank_id when url is generated from api
        );
        let updateRes;
        if (isTest && (isTest === 'true' || isTest === true)) {
          updateRes = {
            expirationDate: generatePayInUrlRes?.expirationDate,
            payInUrl: `${config.reactPaymentOrigin}/transaction/${generatePayInUrlRes?.id}?t=true`, // use env
            payInId: generatePayInUrlRes?.id,
            merchantOrderId: merchant_order_id,
          };
        } else {
          updateRes = {
            expirationDate: generatePayInUrlRes?.expirationDate,
            payInUrl: `${config.reactPaymentOrigin}/transaction/${generatePayInUrlRes?.id}`, // use env
            payInId: generatePayInUrlRes?.id,
            merchantOrderId: merchant_order_id,

          };
        }

        if (ot === "y") {
          return DefaultResponse(
            res,
            200,
            "Payment is assigned & url is sent successfully",
            updateRes
          );
        } else {
          res.redirect(302, updateRes?.payInUrl);
        }
      } else {
        payInData = {
          code,
          merchant_order_id,
          user_id,
          amount,
          return_url: returnUrl ? returnUrl : getMerchantApiKeyByCode?.return_url,
        };

        const generatePayInUrlRes = await payInServices.generatePayInUrl(
          getMerchantApiKeyByCode,
          payInData,
          bankAccountLinkRes[0] // to add the bank_id when url is generated from api
        );
        const updateRes = {
          expirationDate: generatePayInUrlRes?.expirationDate,
          payInUrl: `${config.reactPaymentOrigin}/transaction/${generatePayInUrlRes?.id}`, // use env
          payInId: generatePayInUrlRes?.id,
          merchantOrderId: merchant_order_id,
        };
        return DefaultResponse(
          res,
          200,
          "Payment is assigned & url is sent successfully",
          updateRes
        );
      }
    } catch (err) {
      // Handle errors and pass them to the next middleware
      next(err);
    }
  }

  // To Validate Url
  async validatePayInUrl(req, res, next) {
    try {
      checkValidation(req);

      const { payInId } = req.params;
      const currentTime = Math.floor(Date.now() / 1000);
      const urlValidationRes = await payInRepo.validatePayInUrl(payInId);

      if (!urlValidationRes) {
        throw new CustomError(404, "Payment Url is incorrect");
      }

      if (urlValidationRes?.is_url_expires === true) {
        throw new CustomError(403, "Url is expired");
      }

      if (currentTime > Number(urlValidationRes?.expirationDate)) {
        const payinDataRes = await payInRepo.getPayInData(payInId);
        if (payinDataRes?.status === "ASSIGNED") {
          const urlExpired = await payInRepo.expirePayInUrl(payInId);
          const notifyData = {
            status: "DROPPED",
            merchantOrderId: payinDataRes?.merchant_order_id,
            payinId: payinDataRes?.id,
            amount: null,
            req_amount: payinDataRes?.amount,
            utr_id: payinDataRes?.utr
          };
          logger.info('Notifying merchant about expired URL', { notify_url: payinDataRes?.notify_url, notify_data: notifyData });
          const notifyMerchant = await axios.post(payinDataRes?.notify_url, notifyData);
          logger.warn('Session expired for PayIn URL', { payInId });
          throw new CustomError(403, "Session is expired");
        }
      }

      const updatedRes = {
        code: urlValidationRes?.upi_short_code,
        return_url: urlValidationRes?.return_url,
        notify_url: urlValidationRes?.notify_url,
        expiryTime: Number(urlValidationRes?.expirationDate),
        amount: urlValidationRes?.amount,
        one_time_used: urlValidationRes?.one_time_used
      };
      return DefaultResponse(res, 200, "Payment Url is correct", updatedRes);
    } catch (error) {
      next(error);
    }
  }

  // To Add the bank.
  async assignedBankToPayInUrl(req, res, next) {
    try {
      checkValidation(req);

      const { payInId } = req.params;
      const { amount } = req.body;
      const currentTime = Math.floor(Date.now() / 1000);

      logger.info('Request to assign bank to PayIn URL', { payInId, amount });

      const urlValidationRes = await payInRepo.validatePayInUrl(payInId);

      if (!urlValidationRes) {
        throw new CustomError(404, "Payment Url is incorrect");
      }

      if (urlValidationRes?.is_url_expires === true) {
        throw new CustomError(403, "Url is expired");
      }

      if (currentTime > Number(urlValidationRes?.expirationDate)) {
        const payinDataRes = await payInRepo.getPayInData(payInId)
        if (payinDataRes?.status === "ASSIGNED") {
          const urlExpired = await payInRepo.expirePayInUrl(payInId);
          const notifyData = {
            status: "DROPPED",
            merchantOrderId: payinDataRes?.merchant_order_id,
            payinId: payinDataRes?.id,
            amount: null,
            req_amount: payinDataRes?.amount,
            utr_id: payinDataRes?.utr
          };
          logger.info('Notifying merchant about expired URL', { notify_url: payinDataRes?.notify_url, notify_data: notifyData });
          const notifyMerchant = await axios.post(payinDataRes?.notify_url, notifyData);
          throw new CustomError(403, "Session is expired");
        }
      }
      const getBankDetails = await bankAccountRepo?.getMerchantBankById(
        urlValidationRes?.merchant_id
      );
      let payinBankAccountLinkRes = getBankDetails?.filter((res) => (res?.bankAccount?.bank_used_for === "payIn" && res?.bankAccount?.is_enabled === true));
      if (!getBankDetails || getBankDetails.length === 0 || payinBankAccountLinkRes.length === 0) {
        const payinDataRes = await payInRepo.getPayInData(payInId)
        if (payinDataRes?.status === "ASSIGNED") {
          const urlExpiredBankNotAssignedRes = await payInRepo.expirePayInUrl(
            payInId
          );
          const notifyData = {
            status: "DROPPED",
            merchantOrderId: payinDataRes?.merchant_order_id,
            payinId: payinDataRes?.id,
            amount: null,
            req_amount: payinDataRes?.amount,
            utr_id: payinDataRes?.utr
          };
          logger.info('Notifying merchant about bank not assigned', { notify_url: payinDataRes?.notify_url, notify_data: notifyData });
          const notifyMerchant = await axios.post(payinDataRes?.notify_url, notifyData);
          throw new CustomError(404, "Bank is not assigned");
        }
      }

      // Filter for the enabled bank accounts
      const enabledBanks = getBankDetails?.filter(
        (bank) => bank?.bankAccount?.is_enabled && bank?.bankAccount?.bank_used_for === "payIn"
      );

      if (enabledBanks.length === 0) {
        throw new CustomError(404, "No enabled bank account found");
      }

      // Randomly select one enabled bank account
      const randomIndex = Math.floor(Math.random() * enabledBanks.length);
      const selectedBankDetails = enabledBanks[randomIndex];
      logger.info('Selected bank for assignment', { selectedBank: selectedBankDetails });
      let assignedBankToPayInUrlRes =
        await payInServices.assignedBankToPayInUrl(
          payInId,
          selectedBankDetails,
          parseFloat(amount)
        );

      const payinDataResult = await payInRepo.getPayInData(payInId);
      assignedBankToPayInUrlRes.merchant_min_payin = payinDataResult?.Merchant?.min_payin;
      assignedBankToPayInUrlRes.merchant_max_payin = payinDataResult?.Merchant?.max_payin;

      return DefaultResponse(
        res,
        201,
        "Bank account is assigned",
        assignedBankToPayInUrlRes
      );
    } catch (error) {
      logger.error("Error assigning bank to PayIn URL:", error);
      next(error);
    }
  }
  // To Expire Url
  async expirePayInUrl(req, res, next) {
    try {
      checkValidation(req);
      const { payInId } = req.params;

      const payinDataRes = await payInRepo.getPayInData(payInId)
      if (payinDataRes?.status === "ASSIGNED") {
        const expirePayinUrl = await payInRepo.expirePayInUrl(payInId);
        const notifyData = {
          status: "DROPPED",
          merchantOrderId: payinDataRes?.merchant_order_id,
          payinId: payinDataRes?.id,
          amount: null,
          req_amount: payinDataRes?.amount,
          utr_id: payinDataRes?.utr
        };
        logger.info('Sending notification to merchant', { notify_url: payinDataRes?.notify_url, notify_data: notifyData });
        const notifyMerchant = await axios.post(payinDataRes?.notify_url, notifyData);
        logger.info('Merchant notification response', {
          status: notifyMerchant.status,
          data: notifyMerchant.data,
        });
        return DefaultResponse(res, 200, "Payment Url is expires");
      }
    } catch (error) {
      logger.error("Error expiring PayIn URL:", error);
      next(error);
    }
  }

  async checkPayinStatus(req, res, next) {
    try {
      checkValidation(req);
      const { payinId, merchantCode, merchantOrderId } = req.body;

      if (!merchantCode && !merchantOrderId) {
        return DefaultResponse(res, 400, {
          status: "error",
          error: "Invalid request. Data type mismatch or incomplete request",
        });
      }

      // If query parameters are provided, use them
      const getMerchantApiKeyByCode = await merchantRepo.getMerchantByCode(
        merchantCode
      );

      if (!getMerchantApiKeyByCode) {
        throw new CustomError(404, "Merchant does not exist");
      }

      if (req.headers["x-api-key"] !== getMerchantApiKeyByCode.api_key) {
        if (req.headers["x-api-key"] !== getMerchantApiKeyByCode.public_api_key) {
          throw new CustomError(404, "Enter valid Api key");
        }
      }


      if (!merchantCode) {
        return DefaultResponse(res, 404, {
          status: "error",
          error: "API key / code not found",
        });
      }

      const data = await payInServices.checkPayinStatus(
        payinId,
        merchantCode,
        merchantOrderId
      );
      if (!data) {
        return DefaultResponse(res, 404, {
          status: "error",
          error: "payin not found",
        });
      }


      const response = {
        status: data.status,
        merchantOrderId: data.merchant_order_id,
        amount: data.confirmed,
        payinId: data.id,
        req_amount: data?.amount,
        utr_id: (data.status === "SUCCESS" || data.status === "DISPUTE") ? data?.utr : " "
      };

      return DefaultResponse(
        res,
        200,
        "Payin status fetched successfully",
        response
      );
    } catch (err) {
      next(err);
    }
  }

  async payinAssignment(req, res, next) {
    try {
      checkValidation(req);
      const { payInId, merchantCode, merchantOrderId } = req.body;

      if (!payInId && !merchantCode && !merchantOrderId) {
        return DefaultResponse(res, 400, {
          status: "error",
          code: "invalid-request",
          message: "Invalid request. Data type mismatch or incomplete request",
        });
      }

      const data = await payInServices.payinAssignment(
        payInId,
        merchantCode,
        merchantOrderId
      );

      if (!data) {
        return DefaultResponse(res, 404, {
          status: "error",
          code: "payin-not-found",
          message: "API key / code not found",
        });
      }

      let bankAccount;
      if (data?.bank_acc_id) {
        bankAccount = await bankAccountRepo.getBankByBankAccId(
          data?.bank_acc_id
        );
      } else {
        bankAccount = await bankAccountRepo.getMerchantBankById(merchantCode);
        if (bankAccount.length > 0) {
          bankAccount = bankAccount[0]?.bankAccount;
        }
      }

      if (!bankAccount) {
        return DefaultResponse(res, 404, {
          status: "error",
          code: "invalid-bank-account",
          message: "Bank account not found",
        });
      }

      if (data.status === "SUCCESS") {
        return DefaultResponse(res, 403, {
          status: "error",
          code: "already-confirmed",
          message: "Payout already complete",
        });
      }

      const response = {
        bankAccountName: bankAccount?.bank_name,
        amount: data?.amount,
        payinId: data?.id,
        totalTime: data.duration,
        "time-remaining": data.expirationDate - Math.floor(Date.now() / 1000),
        upiLink: data?.upi_short_code,
        bankAcIfsc: bankAccount?.ifsc,
        merchantOrderId: data?.merchant_order_id,
        bankAccountNumber: bankAccount?.ac_no,
      };

      return DefaultResponse(res, 200, "Payin assigned successfully", response);
    } catch (err) {
      next(err);
    }
  }

  // To Check Payment Status using code. (telegram) From payment site
  async checkPaymentStatus(req, res, next) {
    try {
      checkValidation(req);
      const { payInId } = req.params;
      const getPayInData = await payInRepo.getPayInData(payInId);
      if (!getPayInData) {
        throw new CustomError(404, "Payment does not exist");
      }

      if (getPayInData?.is_url_expires === true) {
        throw new CustomError(400, "Url is already used");
      }

      const getBotDataRes = await botResponseRepo.getBotData(
        getPayInData?.upi_short_code
      );

      if (getBotDataRes) {
        if (getBotDataRes.is_used === false) {
          const updateBotIsUsedRes = await botResponseRepo.updateBotResponse(
            getBotDataRes?.amount_code
          );

          const updateMerchantDataRes = await merchantRepo.updateMerchant(
            getPayInData?.merchant_id,
            parseFloat(getBotDataRes?.amount)
          );
          const updateBankAccRes =
            await bankAccountRepo.updateBankAccountBalance(
              getPayInData?.bank_acc_id,
              parseFloat(getBotDataRes?.amount)
            );

          const payinCommission = await calculateCommission(
            getBotDataRes?.amount,
            updateMerchantDataRes?.payin_commission
          );

          if (
            parseFloat(getBotDataRes?.amount) ===
            parseFloat(getPayInData?.amount)
          ) {
            const updatePayInData = {
              confirmed: getBotDataRes?.amount,
              status: "SUCCESS",
              is_notified: true,
              utr: getBotDataRes?.utr,
              approved_at: new Date(),
              is_url_expires: true,
              payin_commission: payinCommission,
            };

            const updatePayInRes = await payInRepo.updatePayInData(
              payInId,
              updatePayInData
            );

            const response = {
              status: "SUCCESS",
              amount: getBotDataRes?.amount,
              merchant_order_id: getPayInData?.merchant_order_id,
              utr_id: getBotDataRes?.utr,
              return_url: getPayInData?.return_url,
            };

            return DefaultResponse(
              res,
              200,
              "Payment status updated successfully",
              response
            );
          } else {
            const updatePayInData = {
              confirmed: getBotDataRes?.amount,
              status: "DISPUTE",
              utr: getBotDataRes?.utr,
              approved_at: new Date(),
              is_url_expires: true,
            };

            const updatePayInRes = await payInRepo.updatePayInData(
              payInId,
              updatePayInData
            );

            const response = {
              status: "DISPUTE",
              amount: getBotDataRes?.amount,
              utr_id: getBotDataRes?.utr,
              merchant_order_id: getPayInData?.merchant_order_id,
              return_url: getPayInData?.return_url,
            };

            return DefaultResponse(
              res,
              200,
              "Payment status updated successfully as Dispute",
              response
            );
          }
        } else if (getBotDataRes.is_used === true) {
          const response = {
            status: "SUCCESS",
            amount: getBotDataRes?.amount,
            utr_id: getBotDataRes?.utr,
            merchant_order_id: getPayInData?.merchant_order_id,
            return_url: getPayInData?.return_url,
          };
          return DefaultResponse(
            res,
            200,
            "Payment is added for this transaction",
            response
          );
        }
      } else {
        const elseResponse = {
          status: "PENDING",
          amount: 0,
          payInId: payInId,
          merchant_order_id: getPayInData?.merchant_order_id,
        };

        return DefaultResponse(res, 200, "Status Pending", elseResponse);
      }
    } catch (error) {
      next(error);
    }
  }

  // To Handle payment process
  async payInProcess(req, res, next) {
    try {
      checkValidation(req);
      const { payInId } = req.params;
      // const userIp = req.headers['x-forwarded-for'] || req.ip || req.connection.remoteAddress;
      const { usrSubmittedUtr, code, amount, isFront, filePath } = req.body;
      let payInData;
      let responseMessage;

      const getPayInData = await payInRepo.getPayInData(payInId);
      if (!getPayInData) {
        throw new CustomError(404, "Payment does not exist");
      }

      const isBankExist = await bankAccountRepo?.getBankDataByBankId(getPayInData?.bank_acc_id)
      if (!isBankExist) {
        throw new CustomError(404, "Bank account does not exist");
      }

      const urlValidationRes = await payInRepo.validatePayInUrl(payInId);

      // check tht usrSubmittedUtr is previously used or not if it is thn send Duplicate utr.
      let isUsrSubmittedUtrUsed
      isUsrSubmittedUtrUsed = await payInRepo.getPayinDataByUsrSubmittedUtr(usrSubmittedUtr);
      if (isUsrSubmittedUtrUsed.length == 0) {
        isUsrSubmittedUtrUsed = await payInRepo.getPayinDataByUtr(usrSubmittedUtr);
      }

      const durMs = new Date() - getPayInData.createdAt;
      const durSeconds = Math.floor((durMs / 1000) % 60).toString().padStart(2, '0');
      const durMinutes = Math.floor((durSeconds / 60) % 60).toString().padStart(2, '0');
      const durHours = Math.floor((durMinutes / 60) % 24).toString().padStart(2, '0');
      const duration = `${durHours}:${durMinutes}:${durSeconds}`;
      const payinStatus = ['SUCCESS', 'DUPLICATE', 'DISPUTE', 'BANK_MISMATCH'];

      if (payinStatus.includes(getPayInData?.status)) {
        let response = {
          status: getPayInData?.status,
          amount,
          merchant_order_id: getPayInData?.merchant_order_id,
          return_url: getPayInData?.return_url,
          utr_id: getPayInData?.user_submitted_utr
        };

        if (getPayInData?.status === "DUPLICATE") {
          response.utr_id = getPayInData?.utr !== null ? getPayInData?.utr : getPayInData?.user_submitted_utr;
        }

        const message = getPayInData?.status === "BANK_MISMATCH" ? "Bank mismatch" : responseMessage;

        const notifyData = {
          status: getPayInData?.status,
          merchantOrderId: getPayInData?.merchant_order_id,
          payinId: getPayInData?.payInId,
          amount: getPayInData?.confirmed,
          req_amount: getPayInData?.amount,
          utr_id: getPayInData?.utr,
        };

        try {
          logger.info('Sending notification to merchant', { notify_url: getPayInData?.notify_url, notify_data: notifyData });
          //When we get the notify url we will add it.
          const notifyMerchant = await axios.post(getPayInData?.notify_url, notifyData);
          logger.info('Sending notification to merchant', {
            status: notifyMerchant.status,
            data: notifyMerchant.data,
          })

        } catch (error) {
          logger.error("Error sending notification:", error);
        }

        return DefaultResponse(res, 200, message, response);
      }
      else {
        if (isUsrSubmittedUtrUsed.length > 0) {
          payInData = {
            amount,
            status: "DUPLICATE",
            is_notified: true,
            user_submitted_utr: usrSubmittedUtr,
            is_url_expires: true,
            user_submitted_image: null,
            duration: duration,
            // user_ip: userIp
          };
          responseMessage = "Duplicate Payment Found";
          const updatePayinRes = await payInRepo.updatePayInData(
            payInId,
            payInData
          );

          const notifyData = {
            status: updatePayinRes?.status,
            merchantOrderId: updatePayinRes?.merchant_order_id,
            payinId: payInId,
            amount: updatePayinRes?.confirmed,
            req_amount: amount,
            utr_id: updatePayinRes?.utr,
          };
  
          try {
            logger.info('Sending notification to merchant', { notify_url: getPayInData.notify_url, notify_data: notifyData });
            //When we get the notify url we will add it.
            const notifyMerchant = await axios.post(getPayInData.notify_url, notifyData);
            logger.info('Sending notification to merchant', {
              status: notifyMerchant.status,
              data: notifyMerchant.data,
            })
  
          } catch (error) {
            logger.error("Error sending notification:", error);
          }

          const response = {
            status: payInData.status,
            amount,
            merchant_order_id: updatePayinRes?.merchant_order_id,
            return_url: updatePayinRes?.return_url,
            utr_id: updatePayinRes?.utr !== null ? updatePayinRes?.utr : updatePayinRes?.user_submitted_utr
          };
          return DefaultResponse(res, 200, responseMessage, response);
        }

        if (isFront !== true) {
          // is front is used to check it is coming from deposit img pending or not.
          if (urlValidationRes?.is_url_expires === true) {
            throw new CustomError(403, "Url is expired");
          }
        }

        if (filePath) {
          // we have to remove the img from the s3
          // fs.unlink(`public/${filePath}`, (err) => {
          //   if (err) console.error("Error deleting the file:", err);
          // });
        }


        const matchDataFromBotRes = await botResponseRepo.getBotResByUtr(
          usrSubmittedUtr
        );

        let getBankDataByBotRes;
        // we are making sure that we get bank name then only we move forward
        if (matchDataFromBotRes?.bankName !== getPayInData?.bank_name) {
          // We check bank exist here as we have to add the data to the res no matter what comes.

          getBankDataByBotRes = await botResponseRepo?.getBankDataByBankName(matchDataFromBotRes?.bankName)

          if (!getBankDataByBotRes) {
            const payInData = {
              confirmed: matchDataFromBotRes?.amount,
              amount: amount,
              status: "BANK_MISMATCH",
              is_notified: true,
              is_url_expires: true,
              utr: matchDataFromBotRes?.utr,
              user_submitted_utr: usrSubmittedUtr,
              approved_at: new Date(),
              duration: duration,
              // user_ip: userIp
            };

            const updatePayInDataRes = await payInRepo.updatePayInData(
              getPayInData.id,
              payInData
            );

            await botResponseRepo.updateBotResponseByUtr(
              matchDataFromBotRes?.id,
              usrSubmittedUtr
            );

            // We are adding the amount to the bank as we want to update the balance of the bank
            // await bankAccountRepo.updateBankAccountBalance(
            //   getBankDataByBotRes?.id,
            //   parseFloat(amount)
            // );

            const notifyData = {
              status: updatePayInDataRes?.status,
              merchantOrderId: updatePayInDataRes?.merchant_order_id,
              payinId: payInId,
              amount: updatePayInDataRes?.confirmed,
              req_amount: amount,
              utr_id: updatePayInDataRes?.utr,
            };
    
            try {
              logger.info('Sending notification to merchant', { notify_url: getPayInData.notify_url, notify_data: notifyData });
              //When we get the notify url we will add it.
              const notifyMerchant = await axios.post(getPayInData.notify_url, notifyData);
              logger.info('Sending notification to merchant', {
                status: notifyMerchant.status,
                data: notifyMerchant.data,
              })
    
            } catch (error) {
              logger.error("Error sending notification:", error);
            }

            const response = {
              status: updatePayInDataRes.status,
              amount,
              merchant_order_id: updatePayInDataRes?.merchant_order_id,
              return_url: updatePayInDataRes?.return_url,
              utr_id: updatePayInDataRes?.user_submitted_utr
            };

            return DefaultResponse(
              res,
              200,
              "Bank mismatch",
              response
            );
          }
        }

        if (!matchDataFromBotRes) {
          payInData = {
            amount,
            status: "PENDING",
            user_submitted_utr: usrSubmittedUtr,
            is_url_expires: true,
            user_submitted_image: null,
            // user_ip: userIp
          };
          responseMessage = "Payment Not Found";
        } else if (matchDataFromBotRes.is_used === true) {
          payInData = {
            amount,
            status: "DUPLICATE",
            is_notified: true,
            user_submitted_utr: usrSubmittedUtr,
            is_url_expires: true,
            user_submitted_image: null,
            duration: duration,
            // user_ip: userIp

          };

          responseMessage = "Duplicate Payment Found";
        } else {
          if (matchDataFromBotRes?.bankName !== getPayInData?.bank_name) {
            // if (isBankExist?.Merchant_Bank?.length === 1) {
            // if (getBankDataByBotRes?.id !== isBankExist?.id) {
            const payInData = {
              confirmed: matchDataFromBotRes?.amount,
              amount: amount,
              status: "BANK_MISMATCH",
              is_notified: true,
              is_url_expires: true,
              utr: matchDataFromBotRes?.utr,
              user_submitted_utr: usrSubmittedUtr,
              approved_at: new Date(),
              duration: duration,
              // user_ip: userIp
            };

            const updatePayInDataRes = await payInRepo.updatePayInData(
              getPayInData.id,
              payInData
            );

            await botResponseRepo.updateBotResponseByUtr(
              matchDataFromBotRes?.id,
              usrSubmittedUtr
            );

            // We are adding the amount to the bank as we want to update the balance of the bank
            // await bankAccountRepo.updateBankAccountBalance(
            //   getBankDataByBotRes?.id,
            //   parseFloat(amount)
            // );

            const notifyData = {
              status: updatePayInDataRes?.status,
              merchantOrderId: updatePayInDataRes?.merchant_order_id,
              payinId: payInId,
              amount: updatePayInDataRes?.confirmed,
              req_amount: amount,
              utr_id: updatePayInDataRes?.utr,
            };
    
            try {
              logger.info('Sending notification to merchant', { notify_url: getPayInData.notify_url, notify_data: notifyData });
              //When we get the notify url we will add it.
              const notifyMerchant = await axios.post(getPayInData.notify_url, notifyData);
              logger.info('Sending notification to merchant', {
                status: notifyMerchant.status,
                data: notifyMerchant.data,
              })
    
            } catch (error) {
              logger.error("Error sending notification:", error);
            }

            const response = {
              status: updatePayInDataRes.status,
              amount,
              merchant_order_id: updatePayInDataRes?.merchant_order_id,
              return_url: updatePayInDataRes?.return_url,
              utr_id: updatePayInDataRes?.user_submitted_utr
            };

            return DefaultResponse(
              res,
              200,
              "Bank mismatch",
              response
            );
            //   }
            // }
          }

          await botResponseRepo.updateBotResponseByUtr(
            matchDataFromBotRes?.id,
            usrSubmittedUtr
          );

          const updateMerchantRes = await merchantRepo.updateMerchant(
            getPayInData?.merchant_id,
            parseFloat(matchDataFromBotRes?.amount)
          );

          const updateBankRes = await bankAccountRepo.updateBankAccountBalance(
            getPayInData?.bank_acc_id,
            parseFloat(matchDataFromBotRes?.amount)
          );
          const payinCommission =  calculateCommission(
            matchDataFromBotRes?.amount,
            updateMerchantRes?.payin_commission
          );

          if (parseFloat(amount) === parseFloat(matchDataFromBotRes?.amount)) {
            payInData = {
              confirmed: matchDataFromBotRes?.amount,
              status: "SUCCESS",
              is_notified: true,
              utr: matchDataFromBotRes.utr,
              user_submitted_utr: usrSubmittedUtr,
              approved_at: new Date(),
              is_url_expires: true,
              payin_commission: payinCommission,
              user_submitted_image: null,
              duration: duration,
              // user_ip: userIp
            };
            responseMessage = "Payment Done successfully";
          } else {
            payInData = {
              confirmed: matchDataFromBotRes?.amount,
              status: "DISPUTE",
              utr: matchDataFromBotRes.utr,
              user_submitted_utr: usrSubmittedUtr,
              approved_at: new Date(),
              is_url_expires: true,
              user_submitted_image: null,
              duration: duration,
              // user_ip: userIp

            };
            responseMessage = "Dispute in Payment";
          }
        }
        
        const updatePayinRes = await payInRepo.updatePayInData(
          payInId,
          payInData
        );

        const notifyData = {
          status: updatePayinRes?.status,
          merchantOrderId: updatePayinRes?.merchant_order_id,
          payinId: payInId,
          amount: updatePayinRes?.confirmed,
          req_amount: amount,
          utr_id: (updatePayinRes?.status === "SUCCESS" || updatePayinRes?.status === "DISPUTE") ? updatePayinRes?.utr : ""
        };

        try {
          logger.info('Sending notification to merchant', { notify_url: getPayInData.notify_url, notify_data: notifyData });
          //When we get the notify url we will add it.
          const notifyMerchant = await axios.post(getPayInData.notify_url, notifyData);
          logger.info('Sending notification to merchant', {
            status: notifyMerchant.status,
            data: notifyMerchant.data,
          })

        } catch (error) {
          logger.error("Error sending notification:", error);
        }


        const response = {
          status: updatePayinRes?.status,
          amount,
          merchant_order_id: updatePayinRes?.merchant_order_id,
          return_url: updatePayinRes?.return_url,
          utr_id: updatePayinRes?.user_submitted_utr
        };

        // if (payInData.status === "SUCCESS") {
        //   response.utr_id = updatePayinRes?.utr;
        // }

        return DefaultResponse(res, 200, responseMessage, response);
      }
    } catch (error) {
      next(error);
    }
  }

  // To Get pay-in data.
  async getAllPayInData(req, res, next) {
    try {
      const {
        sno,
        upiShortCode,
        confirmed,
        amount,
        merchantOrderId,
        merchantCode,
        vendorCode,
        userId,
        userSubmittedUtr,
        utr,
        payInId,
        dur,
        status,
        bank,
        filterToday,
      } = req.query;
      const page = parseInt(req.query.page) || 1;
      const pageSize = parseInt(req.query.pageSize) || 20;
      const skip = (page - 1) * pageSize;
      const take = pageSize;

      const filterTodayBool = filterToday === "false"; // to check the today entry

      const payInDataRes = await payInServices.getAllPayInData(
        skip,
        take,
        parseInt(sno),
        upiShortCode,
        confirmed,
        amount,
        merchantOrderId,
        merchantCode,
        vendorCode,
        userId,
        userSubmittedUtr,
        utr,
        payInId,
        dur,
        status,
        bank,
        filterTodayBool
      );

      return DefaultResponse(
        res,
        200,
        "PayIn data fetched successfully",
        payInDataRes
      );
    } catch (error) {
      next(error);
    }
  }

  // handle payin using img
  async payInProcessByImg(req, res, next) {
    try {
      const { payInId } = req.params;
      const { amount } = req.query;

      const command = new GetObjectCommand({
        Bucket: config.bucketName,
        Key: req.file?.key,
      });

      const { Body } = await s3.send(command);

      // Convert the readable stream to a buffer using pipeline
      const base64Image = await streamToBase64(Body);
      const imgData = {
        image: base64Image,
      };
      const resFromOcrPy = await axios.post(
        "http://54.172.72.118:8000/ocr",
        imgData
      );

      if (resFromOcrPy?.data?.status === "failure") {
        const imageUrl = `${req?.file?.key}`;
        const payInData = {
          amount,
          status: "IMG_PENDING",
          is_url_expires: true,
          user_submitted_image: imageUrl,
        };
        const updatePayinRes = await payInRepo.updatePayInData(
          payInId,
          payInData
        );
        const response = {
          status: "Not Found",
          amount,
          merchant_order_id: updatePayinRes?.merchant_order_id,
          return_url: updatePayinRes?.return_url,
        };
        return DefaultResponse(res, 200, "Utr is not recognized", response);
      }

      // Merge the data from the API with the existing dataRes
      const usrSubmittedUtr = {
        amount: resFromOcrPy?.data?.data?.amount, //|| dataRes.amount,
        utr: resFromOcrPy?.data?.data?.transaction_id, //|| dataRes.utr
      };

      if (usrSubmittedUtr?.utr !== undefined && usrSubmittedUtr?.utr !== "null" && usrSubmittedUtr?.utr !== null && usrSubmittedUtr?.utr !== "") {
        const usrSubmittedUtrData = usrSubmittedUtr?.utr;

        const isUtrExist = await payInRepo.getPayinDataByUsrSubmittedUtr(usrSubmittedUtrData)
        const getPayInData = await payInRepo.getPayInData(payInId);

        const durMs = new Date() - getPayInData.createdAt;
        const durSeconds = Math.floor((durMs / 1000) % 60).toString().padStart(2, '0');
        const durMinutes = Math.floor((durSeconds / 60) % 60).toString().padStart(2, '0');
        const durHours = Math.floor((durMinutes / 60) % 24).toString().padStart(2, '0');
        const duration = `${durHours}:${durMinutes}:${durSeconds}`;

        if (isUtrExist.length > 0) {
          const updatePayInData = {
            amount,
            status: "DUPLICATE",
            is_notified: true,
            user_submitted_utr: usrSubmittedUtrData,
            is_url_expires: true,
            duration: duration
          };
          const updatePayinRes = await payInRepo.updatePayInData(
            payInId,
            updatePayInData
          );
          const response = {
            status: updatePayinRes.status,
            amount,
            merchant_order_id: updatePayinRes?.merchant_order_id,
            return_url: updatePayinRes?.return_url,
            utr_id: updatePayinRes?.user_submitted_utr,
          };
          return DefaultResponse(res, 200, "Duplicate Payment Found", response);
        }

        if (!getPayInData) {
          throw new CustomError(404, "Payment does not exist");
        }

        const isBankExist = await bankAccountRepo?.getBankDataByBankId(getPayInData?.bank_acc_id)

        if (!isBankExist) {
          throw new CustomError(404, "Bank account does not exist");
        }

        const urlValidationRes = await payInRepo.validatePayInUrl(payInId);
        if (urlValidationRes?.is_url_expires === true) {
          throw new CustomError(403, "Url is expired");
        }

        const matchDataFromBotRes = await botResponseRepo.getBotResByUtr(
          usrSubmittedUtrData
        );
        let payInData;
        let responseMessage;

        //
        let getBankDataByBotRes;
        // we are making sure that we get bank name then only we move forward
        if (matchDataFromBotRes?.bankName) {
          // We check bank exist here as we have to add the data to the res no matter what comes.
          getBankDataByBotRes = await botResponseRepo?.getBankDataByBankName(matchDataFromBotRes?.bankName)

          if (!getBankDataByBotRes) {
            const payInData = {
              confirmed: parseFloat(matchDataFromBotRes?.amount),
              amount: amount,
              status: "BANK_MISMATCH",
              is_notified: true,
              is_url_expires: true,
              utr: matchDataFromBotRes?.utr,
              user_submitted_utr: usrSubmittedUtrData,
              approved_at: new Date(),
              duration: duration,
            };

            const updatePayInDataRes = await payInRepo.updatePayInData(
              getPayInData.id,
              payInData
            );

            // We are adding the amount to the bank as we want to update the balance of the bank
            // const updateBankRes = await bankAccountRepo.updateBankAccountBalance(
            //   getBankDataByBotRes?.id,
            //   parseFloat(amount)
            // );

            const response = {
              status: updatePayInDataRes.status,
              amount,
              merchant_order_id: updatePayInDataRes?.merchant_order_id,
              return_url: updatePayInDataRes?.return_url,
              utr_id: updatePayInDataRes?.user_submitted_utr
            };

            return DefaultResponse(
              res,
              200,
              "Bank mismatch",
              response
            );
          }
        }

        if (parseFloat(usrSubmittedUtr.amount) !== parseFloat(getPayInData?.amount)) {
          const updatePayInData = {
            confirmed: usrSubmittedUtr.amount,
            amount: getPayInData?.amount,
            status: "DISPUTE",
            is_notified: true,
            is_url_expires: true,
            user_submitted_utr: usrSubmittedUtrData,
            approved_at: new Date(),
            duration: duration,
          };
          const updatePayinRes = await payInRepo.updatePayInData(
            payInId,
            updatePayInData
          );
          const response = {
            status: updatePayinRes.status,
            amount,
            merchant_order_id: updatePayinRes?.merchant_order_id,
            return_url: updatePayinRes?.return_url,
            utr_id: updatePayinRes?.user_submitted_utr,
          };
          return DefaultResponse(res, 200, "Payment Disputed", response);
        }

        // if (parseFloat(usrSubmittedUtr.amount) === parseFloat(getPayInData?.amount)) {
          if (!matchDataFromBotRes) {
            payInData = {
              status: "PENDING",
              amount,
              user_submitted_utr: usrSubmittedUtrData,
              is_url_expires: true,
            };
            responseMessage = "Payment Not Found";
          } else if (matchDataFromBotRes.is_used === true) {
            payInData = {
              amount,
              status: "DUPLICATE",
              is_notified: true,
              user_submitted_utr: usrSubmittedUtrData,
              is_url_expires: true,
              duration: duration
            };
            responseMessage = "Duplicate Payment Found";
          } else {

            if (matchDataFromBotRes?.bankName) {
              if (isBankExist?.Merchant_Bank?.length === 1) {
                if (getBankDataByBotRes?.id !== isBankExist?.id) {
                  const payInData = {
                    confirmed: parseFloat(matchDataFromBotRes?.amount),
                    amount: amount,
                    status: "BANK_MISMATCH",
                    is_notified: true,
                    is_url_expires: true,
                    utr: matchDataFromBotRes?.utr,
                    user_submitted_utr: usrSubmittedUtrData,
                    approved_at: new Date(),
                    duration: duration,
                  };

                  const updatePayInDataRes = await payInRepo.updatePayInData(
                    getPayInData.id,
                    payInData
                  );

                  // We are adding the amount to the bank as we want to update the balance of the bank
                  // const updateBankRes = await bankAccountRepo.updateBankAccountBalance(
                  //   getBankDataByBotRes?.id,
                  //   parseFloat(amount)
                  // );

                  const response = {
                    status: updatePayInDataRes.status,
                    amount,
                    merchant_order_id: updatePayInDataRes?.merchant_order_id,
                    return_url: updatePayInDataRes?.return_url,
                    utr_id: updatePayInDataRes?.user_submitted_utr
                  };

                  return DefaultResponse(
                    res,
                    200,
                    "Bank mismatch",
                    response
                  );
                }
              }
            }
            await botResponseRepo.updateBotResponseByUtr(
              matchDataFromBotRes?.id,
              usrSubmittedUtrData
            );
            const updateMerchantDataRes = await merchantRepo.updateMerchant(
              getPayInData?.merchant_id,
              parseFloat(matchDataFromBotRes?.amount)
            );
            await bankAccountRepo.updateBankAccountBalance(
              getPayInData?.bank_acc_id,
              parseFloat(matchDataFromBotRes?.amount)
            );
            const payinCommission = calculateCommission(
              matchDataFromBotRes?.amount,
              updateMerchantDataRes?.payin_commission
            );

            if (parseFloat(amount) === parseFloat(matchDataFromBotRes?.amount)) {

              payInData = {
                confirmed: matchDataFromBotRes?.amount,
                status: "SUCCESS",
                is_notified: true,
                utr: matchDataFromBotRes.utr,
                user_submitted_utr: usrSubmittedUtrData,
                payin_commission: payinCommission,
                approved_at: new Date(),
                is_url_expires: true,
                duration: duration
              };
              responseMessage = "Payment Done successfully";
            } else {
              payInData = {
                confirmed: matchDataFromBotRes?.amount,
                status: "DISPUTE",
                utr: matchDataFromBotRes.utr,
                user_submitted_utr: usrSubmittedUtrData,
                approved_at: new Date(),
                is_url_expires: true,
                duration: duration
              };
              responseMessage = "Dispute in Payment";
            }
          }
        // }
        // else {
        //   const payInData = {
        //     confirmed: usrSubmittedUtr.amount,
        //     amount: getPayInData?.amount,
        //     status: "DISPUTE",
        //     is_notified: true,
        //     is_url_expires: true,
        //     user_submitted_utr: usrSubmittedUtrData,
        //     approved_at: new Date(),
        //     duration: duration,
        //   };

        //   const updatePayInDataRes = await payInRepo.updatePayInData(
        //     getPayInData.id,
        //     payInData
        //   );

        //   // We are adding the amount to the bank as we want to update the balance of the bank
        //   // const updateBankRes = await bankAccountRepo.updateBankAccountBalance(
        //   //   getBankDataByBotRes?.id,
        //   //   parseFloat(amount)
        //   // );

        //   const response = {
        //     status: updatePayInDataRes.status,
        //     amount,
        //     merchant_order_id: updatePayInDataRes?.merchant_order_id,
        //     return_url: updatePayInDataRes?.return_url,
        //     utr_id: updatePayInDataRes?.user_submitted_utr
        //   };

        //   return DefaultResponse(
        //     res,
        //     200,
        //     "Dispute",
        //     response
        //   );
        // }
        const updatePayinRes = await payInRepo.updatePayInData(
          payInId,
          payInData
        );

        const notifyData = {
          status: updatePayinRes?.status,
          merchantOrderId: updatePayinRes?.merchant_order_id,
          payinId: payInId,
          amount: updatePayinRes?.confirmed,
          req_amount: amount,
          utr_id: updatePayinRes?.utr
        };
        try {
          //When we get the notify url we will add it.
          logger.info('Sending notification to merchant', { notify_url: getPayInData.notify_url, notify_data: notifyData });

          const notifyMerchant = await axios.post(getPayInData.notify_url, notifyData);
          logger.info('Sending notification to merchant', {
            status: notifyMerchant.status,
            data: notifyMerchant.data,
          })
        } catch (error) {
          logger.error("Error sending notification:", error);
        }
        // }

        const response = {
          status:
            payInData.status === "SUCCESS"
              ? "SUCCESS"
              : payInData.status || "Not Found",
          amount,
          merchant_order_id: updatePayinRes?.merchant_order_id,
          return_url: updatePayinRes?.return_url,
        };

        if (payInData.status === "SUCCESS") {
          response.utr_id = updatePayinRes?.utr;
        }
        else if (payInData.status === "PENDING") {
          response.utr_id = updatePayinRes?.user_submitted_utr;
        }

        return DefaultResponse(res, 200, responseMessage, response);
        // }
      } else {
        // No UTR found, send image URL to the controller
        const imageUrl = `${req?.file?.key}`;
        const payInData = {
          amount,
          status: "IMG_PENDING",
          is_url_expires: true,
          user_submitted_image: imageUrl,
        };
        const updatePayinRes = await payInRepo.updatePayInData(
          payInId,
          payInData
        );
        const response = {
          status: "Not Found",
          amount,
          merchant_order_id: updatePayinRes?.merchant_order_id,
          return_url: updatePayinRes?.return_url,
        };
        return DefaultResponse(res, 200, "Utr is not recognized", response);
      }
    } catch (error) {
      console.error("Error processing the image:", error);
      next(error);
    }
  }

  async getAllPayInDataByMerchant(req, res, next) {
    try {
      let { merchantCode, startDate, endDate, includeSubMerchant } = req.query;
      
      if (merchantCode == null) {
        merchantCode = [];
      } else if (typeof merchantCode === "string") {
        merchantCode = [merchantCode];
      }

      if(includeSubMerchant === 'false'){
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

        const payInDataRes = await payInServices.getAllPayInDataByMerchant(
          allNewMerchantCodes,
          startDate,
          endDate
        );

        return DefaultResponse(
          res,
          200,
          "PayIn data fetched successfully",
          payInDataRes
        );

      } else {
        const payInDataRes = await payInServices.getAllPayInDataByMerchant(
          merchantCode,
          startDate,
          endDate
        );
  
        return DefaultResponse(
          res,
          200,
          "PayIn data fetched successfully",
          payInDataRes
        );
      }

    } catch (error) {
      next(error);
    }
  }

  async getMerchantsNetBalance(req, res, next) {
    try {
      let { merchantCode, includeSubMerchant } = req.query;

      if (merchantCode == null) {
        merchantCode = [];
      } else if (typeof merchantCode === "string") {
        merchantCode = [merchantCode];
      }

      if(includeSubMerchant === 'false') {
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

        const payInDataRes = await payInServices.getMerchantsNetBalance(
          allNewMerchantCodes
        );

        return DefaultResponse(
          res,
          200,
          "PayIn data fetched successfully",
          payInDataRes
        );
      } else {
        const payInDataRes = await payInServices.getMerchantsNetBalance(
          merchantCode
        );
  
        return DefaultResponse(
          res,
          200,
          "PayIn data fetched successfully",
          payInDataRes
        );
      }
    } catch (error) {
      next(error);
    }
  }

  async getVendorsNetBalance(req, res, next) {
    try {
      let { vendorCode } = req.query;

      if (vendorCode == null) {
        vendorCode = [];
      }

      // const vendorCodes = Array.isArray(vendorCode)
      //   ? vendorCode
      //   : vendorCode.split(',');

      // if (vendorCodes.length === 0) {
      //   return res.status(400).json({ error: 'No merchant codes provided' });
      // }

      const payInDataRes = await payInServices.getVendorsNetBalance(
        vendorCode
      );

      return DefaultResponse(
        res,
        200,
        "PayIn data fetched successfully",
        payInDataRes
      );
    } catch (error) {
      next(error);
    }
  }

  async getAllPayInDataByVendor(req, res, next) {
    try {
      let { vendorCode, startDate, endDate } = req.query;
      if (vendorCode == null) {
        vendorCode = [];
      } else if (typeof vendorCode === "string") {
        vendorCode = [vendorCode];
      }

      const payInDataRes = await payInServices.getAllPayInDataByVendor(
        vendorCode,
        startDate,
        endDate,
      );

      return DefaultResponse(
        res,
        200,
        "PayIn vendor data fetched successfully",
        payInDataRes
      );
    } catch (error) {
      next(error);
    }
  }

  //new get All pay In data.
  async getAllPayInDataWithRange(req, res, next) {
    try {
      checkValidation(req);
      let { merchantCode, status, startDate, endDate, includeSubMerchant } = req.body;

      // const start = new Date(startDate);
      // const end = new Date(endDate);

      if (!merchantCode) {
        merchantCode = [];
      } else if (typeof merchantCode === "string") {
        merchantCode = [merchantCode];
      }

      // let allNewMerchantCodes = merchantCode;
      // if (!includeSubMerchant) {
      //   allNewMerchantCodes = [];
      //   for (const code of merchantCode) {
      //     const merchantData = await merchantRepo.getMerchantByCode(code);
      //     if (merchantData) {
      //       allNewMerchantCodes = [
      //         ...allNewMerchantCodes,
      //         ...(Array.isArray(merchantData.child_code) ? merchantData.child_code : []),
      //         merchantData.code,
      //       ];
      //     }
      //   }
      // }

      // console.log(allNewMerchantCodes, "allNewMerchantCodes")

      // const chunkSize = 7;
      // let currentDate = new Date(start);
      // let allPayInData = [];
      // let iterationCount = 0;
      // console.log(allPayInData, "allPayInData")
  
      // while (currentDate < end) {
        // iterationCount++;

        // if (iterationCount > 100) {
        //   console.error("Too many iterations, possible infinite loop. Exiting.");
        //   break;
        // }
        // const chunkEndDate = new Date(currentDate);
        // chunkEndDate.setDate(chunkEndDate.getDate() + chunkSize);
        // if (chunkEndDate > end) {
        //   chunkEndDate = new Date(end);
        // }

        // try {
        //   const payInDataRes = await payInServices.getAllPayInDataWithRange(
        //     allNewMerchantCodes,
        //     status,
        //     startDate,
        //     endDate
        //   );
        //   console.log("Data fetched for range:", currentDate, chunkEndDate);
        //   allPayInData = [...allPayInData, ...payInDataRes];
        //   console.log("allPayInData length:", allPayInData.length);

        // } catch (error) {
        //   console.error("Error fetching payIn data for range:", currentDate, chunkEndDate, error);
        //   // break;
        // }

        // currentDate = new Date(chunkEndDate);
        // currentDate.setDate(currentDate.getDate() + 1);
      // }
      // console.log("Exited the loop, allPayInData:", allPayInData.length);
  
      // // Send the response once all data is fetched
      // return DefaultResponse(
      //   res,
      //   200,
      //   "PayIn data fetched successfully",
      //   allPayInData
      // );

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
        const payInDataRes = await payInServices.getAllPayInDataWithRange(
          allNewMerchantCodes,
          status,
          startDate,
          endDate
        );
  
        return DefaultResponse(
          res,
          200,
          "PayIn data fetched successfully",
          payInDataRes
        );
      } else {
        const payInDataRes = await payInServices.getAllPayInDataWithRange(
          merchantCode,
          status,
          startDate,
          endDate
        );
  
        return DefaultResponse(
          res,
          200,
          "PayIn data fetched successfully",
          payInDataRes
        );
      }
    } catch (error) {
      next(error);
    }
  }

  async telegramResHandler(req, res, next) {
    const TELEGRAM_BOT_TOKEN = config?.telegramOcrBotToken;

    try {
      const { message } = req.body;
      res.sendStatus(200);
      if (message) {
        if (message?.caption === undefined) {
          // if (message?.text) {
          //   await sendErrorMessageNoImageFoundTelegramBot(
          //     message.chat.id,
          //     TELEGRAM_BOT_TOKEN,
          //     message?.message_id
          //   );
          //   logger.error("Please add screenshot of the Payment!");
          //   return;
          // } else {
          // await sendErrorMessageNoMerchantOrderIdFoundTelegramBot(
          //   message.chat.id,
          //   TELEGRAM_BOT_TOKEN,
          //   message?.message_id
          // );
          // logger.error("Please enter merchant orderId");
          // return;
          // }
        }

        if (message?.photo) {
          const photoArray = message.photo;
          const fileId = photoArray[photoArray.length - 1]?.file_id;

          const getFileUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getFile?file_id=${fileId}`;
          const getFileResponse = await axios.get(getFileUrl);

          if (!getFileResponse.data.ok) {
            throw new Error("Failed to get file path from Telegram");
          }

          const filePath = getFileResponse.data.result.file_path;
          const downloadUrl = `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${filePath}`;
          const imageResponse = await axios.get(downloadUrl, {
            responseType: "arraybuffer",
          });

          if (imageResponse.status !== 200) {
            throw new Error("Failed to download image from Telegram");
          }

          // Convert the image buffer to Base64
          let base64Image;
          let imageBuffer;
          try {
            imageBuffer = Buffer.from(imageResponse.data, "binary");
            base64Image = imageBuffer.toString("base64");
          } catch (error) {
            console.error("Error converting image to Base64:", error);
            logger.error("Error converting image to Base64");
            return

          }

          let dataRes;

          const imgData = {
            image: base64Image,
          };
          const resFromOcrPy = await axios.post(
            "http://54.172.72.118:8000/ocr",
            imgData
          );

          if (resFromOcrPy?.data?.status === "failure") {

            await sendErrorMessageUtrOrAmountNotFoundImgTelegramBot(
              message.chat.id,
              TELEGRAM_BOT_TOKEN,
              message?.message_id
            );

            const response = {
              status: "Not Found",
              amount,
              merchant_order_id: updatePayinRes?.merchant_order_id,
              return_url: updatePayinRes?.return_url,
            };
            return DefaultResponse(res, 200, "Utr is not recognized", response);
          }

          // Merge the data from the API with the existing dataRes
          dataRes = {
            amount: resFromOcrPy?.data?.data?.amount.replace(",", ""), //|| dataRes.amount,
            utr: resFromOcrPy?.data?.data?.transaction_id, //|| dataRes.utr
            bankName: resFromOcrPy?.data?.data?.bank_name,
            timeStamp: resFromOcrPy?.data?.data?.timestamp,
          };

          await sendTelegramMessage(
            message.chat.id,
            dataRes,
            TELEGRAM_BOT_TOKEN,
            message?.message_id
          );

          if (dataRes) {
            if (dataRes?.utr !== undefined || dataRes?.amount !== undefined) {
              if (message?.caption) {
                const merchantOrderIdTele = message?.caption;
                const getPayInData = await payInRepo.getPayInDataByMerchantOrderId(
                  merchantOrderIdTele
                );
                const getTelegramResByUtr = await botResponseRepo.getBotResByUtr(
                  dataRes?.utr
                );

                if (!getTelegramResByUtr) {
                  await sendErrorMessageNoDepositFoundTelegramBot(
                    message.chat.id,
                    dataRes?.utr,
                    TELEGRAM_BOT_TOKEN,
                    message?.message_id
                  )
                  return
                }

                if (!getPayInData) {
                  await sendErrorMessageTelegram(
                    message.chat.id,
                    merchantOrderIdTele,
                    TELEGRAM_BOT_TOKEN,
                    message?.message_id
                  );
                  logger.error("Merchant order id does not exist")
                  return

                }
                if (getPayInData?.is_notified === true && getPayInData?.status === 'SUCCESS') {
                  let existingPayinData
                  existingPayinData = await payInRepo.getPayinDataByUsrSubmittedUtr(dataRes?.utr);
                  if (existingPayinData.length == 0) {
                    existingPayinData = await payInRepo.getPayinDataByUtr(dataRes?.utr);
                  }
                  await sendAlreadyConfirmedMessageTelegramBot(
                    message.chat.id,
                    dataRes?.utr,
                    TELEGRAM_BOT_TOKEN,
                    message?.message_id,
                    existingPayinData
                  );
                  logger.error("Utr is already used");
                  return
                }
                else {
                  if (getPayInData?.status === 'DUPLICATE') {
                    await sendMerchantOrderIDStatusDuplicateTelegramMessage(
                      message.chat.id,
                      getPayInData,
                      TELEGRAM_BOT_TOKEN,
                      message?.message_id,
                    );
                    logger.error("Merchant Order ID Status is duplicate");
                    return
                  }
                } ``

                let updatePayInData;


                //Bank Mis Match via TELE OCR API
                if (getPayInData?.bank_name !== getTelegramResByUtr?.bankName) {
                  if (getPayInData?.user_submitted_utr) {
                    if (getPayInData?.user_submitted_utr === dataRes?.utr) {
                      if (getTelegramResByUtr?.is_used) {
                        let existingPayinData
                        existingPayinData = await payInRepo.getPayinDataByUsrSubmittedUtr(dataRes?.utr);
                        if (existingPayinData.length == 0) {
                          existingPayinData = await payInRepo.getPayinDataByUtr(dataRes?.utr);
                        }
                        await sendAlreadyConfirmedMessageTelegramBot(
                          message.chat.id,
                          dataRes?.utr,
                          TELEGRAM_BOT_TOKEN,
                          message?.message_id,
                          existingPayinData
                        );
                        logger.error("Utr is already used Bank MissMatch");
                        return
                      }
    
                      const payinCommission = calculateCommission(
                        dataRes?.amount,
                        getPayInData.Merchant?.payin_commission
                      );
    
                      const durMs = new Date() - getPayInData.createdAt;
                      const durSeconds = Math.floor((durMs / 1000) % 60).toString().padStart(2, '0');
                      const durMinutes = Math.floor((durSeconds / 60) % 60).toString().padStart(2, '0');
                      const durHours = Math.floor((durMinutes / 60) % 24).toString().padStart(2, '0');
                      const duration = `${durHours}:${durMinutes}:${durSeconds}`;
    
                      updatePayInData = {
                        confirmed: getTelegramResByUtr?.amount,
                        status: "BANK_MISMATCH",
                        is_notified: true,
                        utr: dataRes.utr,
                        approved_at: new Date(),
                        is_url_expires: true,
                        payin_commission: payinCommission,
                        user_submitted_image: null,
                        duration: duration
                      };
    
                      const updatedPayInData = await payInRepo.updatePayInData(
                        getPayInData?.id,
                        updatePayInData
                      );
    
                      if (getTelegramResByUtr) {
                        await botResponseRepo.updateBotResponseByUtr(
                          getTelegramResByUtr?.id,
                          getTelegramResByUtr?.utr
                        );
                      }
                      else {
                        await sendErrorMessageNoDepositFoundTelegramBot(
                          message.chat.id,
                          dataRes?.utr,
                          TELEGRAM_BOT_TOKEN,
                          message?.message_id
                        )
                        return
                      }
    
                      await sendBankMismatchMessageTelegramBot(
                        message.chat.id,
                        getTelegramResByUtr?.bankName,
                        getPayInData?.bank_name,
                        TELEGRAM_BOT_TOKEN,
                        message?.message_id
                      );
    
                      // Notify url--->
                      const notifyData = {
                        status: "BANK_MISMATCH",
                        merchantOrderId: updatedPayInData?.merchant_order_id,
                        payinId: updatedPayInData?.id,
                        amount: updatedPayInData?.confirmed,
                        req_amount: updatedPayInData?.amount,
                        utr_id: updatedPayInData?.utr
                      }
                      try {
                        //When we get the notify url we will add it.
                        logger.info('Sending notification to merchant', { notify_url: updatedPayInData.notify_url, notify_data: notifyData });
    
                        const notifyMerchant = await axios.post(updatedPayInData.notify_url, notifyData);
                        logger.info('Sending notification to merchant', {
                          status: notifyMerchant.status,
                          data: notifyMerchant.data,
                        })
                      } catch (error) {
                        console.error("Error sending notification:", error);
                      }
    
                      return res.status(200).json({ message: "true" });
                    }
                    else {
                      await sendErrorMessageUtrMismatchTelegramBot(
                        message.chat.id,
                        getPayInData?.user_submitted_utr,
                        dataRes?.utr,
                        TELEGRAM_BOT_TOKEN,
                        message?.message_id
                      );
                      return res.status(200).json({ message: "Utr mismatch" });
                    }
                  }
                  else {
                    if (getTelegramResByUtr?.is_used) {
                      let existingPayinData
                      existingPayinData = await payInRepo.getPayinDataByUsrSubmittedUtr(dataRes?.utr);
                      if (existingPayinData.length == 0) {
                        existingPayinData = await payInRepo.getPayinDataByUtr(dataRes?.utr);
                      }
                      await sendAlreadyConfirmedMessageTelegramBot(
                        message.chat.id,
                        dataRes?.utr,
                        TELEGRAM_BOT_TOKEN,
                        message?.message_id,
                        existingPayinData
                      );
                      logger.error("Utr is already used Bank MissMatch");
                      return
                    }
  
                    const payinCommission = calculateCommission(
                      dataRes?.amount,
                      getPayInData.Merchant?.payin_commission
                    );
  
                    const durMs = new Date() - getPayInData.createdAt;
                    const durSeconds = Math.floor((durMs / 1000) % 60).toString().padStart(2, '0');
                    const durMinutes = Math.floor((durSeconds / 60) % 60).toString().padStart(2, '0');
                    const durHours = Math.floor((durMinutes / 60) % 24).toString().padStart(2, '0');
                    const duration = `${durHours}:${durMinutes}:${durSeconds}`;
  
                    updatePayInData = {
                      confirmed: getTelegramResByUtr?.amount,
                      status: "BANK_MISMATCH",
                      is_notified: true,
                      utr: dataRes.utr,
                      approved_at: new Date(),
                      is_url_expires: true,
                      payin_commission: payinCommission,
                      user_submitted_image: null,
                      duration: duration
                    };
  
                    const updatedPayInData = await payInRepo.updatePayInData(
                      getPayInData?.id,
                      updatePayInData
                    );
  
                    if (getTelegramResByUtr) {
                      await botResponseRepo.updateBotResponseByUtr(
                        getTelegramResByUtr?.id,
                        getTelegramResByUtr?.utr
                      );
                    }
                    else {
                      await sendErrorMessageNoDepositFoundTelegramBot(
                        message.chat.id,
                        dataRes?.utr,
                        TELEGRAM_BOT_TOKEN,
                        message?.message_id
                      )
                      return
                    }
  
                    await sendBankMismatchMessageTelegramBot(
                      message.chat.id,
                      getTelegramResByUtr?.bankName,
                      getPayInData?.bank_name,
                      TELEGRAM_BOT_TOKEN,
                      message?.message_id
                    );
  
                    // Notify url--->
                    const notifyData = {
                      status: "BANK_MISMATCH",
                      merchantOrderId: updatedPayInData?.merchant_order_id,
                      payinId: updatedPayInData?.id,
                      amount: updatedPayInData?.confirmed,
                      req_amount: updatedPayInData?.amount,
                      utr_id: updatedPayInData?.utr
                    }
                    try {
                      //When we get the notify url we will add it.
                      logger.info('Sending notification to merchant', { notify_url: updatedPayInData.notify_url, notify_data: notifyData });
  
                      const notifyMerchant = await axios.post(updatedPayInData.notify_url, notifyData);
                      logger.info('Sending notification to merchant', {
                        status: notifyMerchant.status,
                        data: notifyMerchant.data,
                      })
                    } catch (error) {
                      console.error("Error sending notification:", error);
                    }
  
                    return res.status(200).json({ message: "true" });
                  }
                }

                if (getPayInData?.user_submitted_utr !== null) {
                  const getTelegramResByUtr = await botResponseRepo.getBotResByUtr(
                    dataRes?.utr
                  );
                  if (
                    ((dataRes?.utr === getPayInData?.user_submitted_utr || dataRes?.utr === getPayInData?.utr) && (dataRes?.utr === getTelegramResByUtr?.utr)) || ((dataRes?.utr === getTelegramResByUtr?.utr) && (getPayInData?.status === "PENDING") && (getPayInData?.merchant_order_id === merchantOrderIdTele))
                  ) {

                    if (getTelegramResByUtr.is_used) {
                      let existingPayinData
                      existingPayinData = await payInRepo.getPayinDataByUsrSubmittedUtr(dataRes?.utr);
                      if (existingPayinData.length == 0) {
                        existingPayinData = await payInRepo.getPayinDataByUtr(dataRes?.utr);
                      }
                      await sendAlreadyConfirmedMessageTelegramBot(
                        message.chat.id,
                        dataRes?.utr,
                        TELEGRAM_BOT_TOKEN,
                        message?.message_id,
                        existingPayinData
                      );
                      return res.status(200).json({ message: "Utr is already used" });
                    }

                    // Here, getTelegramResByUtr.amount is used instead of dataRes.amount to handle cases where the slip may have been altered in a fraud scenario
                    if (parseFloat(getTelegramResByUtr?.amount) == parseFloat(dataRes?.amount) && parseFloat(dataRes?.amount) === parseFloat(getPayInData?.amount)) { // changes done here++++++++++
                      if (getPayInData?.user_submitted_utr) {
                        if (getPayInData?.user_submitted_utr === dataRes?.utr) {
                          const payinCommission = calculateCommission(
                            dataRes?.amount,
                            getPayInData.Merchant?.payin_commission
                          );
    
                          const durMs = new Date() - getPayInData.createdAt;
                          const durSeconds = Math.floor((durMs / 1000) % 60).toString().padStart(2, '0');
                          const durMinutes = Math.floor((durSeconds / 60) % 60).toString().padStart(2, '0');
                          const durHours = Math.floor((durMinutes / 60) % 24).toString().padStart(2, '0');
                          const duration = `${durHours}:${durMinutes}:${durSeconds}`;
    
                          updatePayInData = {
                            confirmed: dataRes?.amount,
                            status: "SUCCESS",
                            is_notified: true,
                            utr: dataRes.utr,
                            approved_at: new Date(),
                            is_url_expires: true,
                            payin_commission: payinCommission,
                            user_submitted_image: null,
                            duration: duration,
    
                          };
                          const updatedPayInData = await payInRepo.updatePayInData(
                            getPayInData?.id,
                            updatePayInData
                          );
    
                          await botResponseRepo.updateBotResponseByUtr(
                            getTelegramResByUtr?.id,
                            getTelegramResByUtr?.utr
                          );
    
                          await sendSuccessMessageTelegram(
                            message.chat.id,
                            merchantOrderIdTele,
                            TELEGRAM_BOT_TOKEN,
                            message?.message_id
                          );
    
                          // ----> Notify url
                          try {
    
                            const notifyData = {
                              status: "SUCCESS",
                              merchantOrderId: updatedPayInData?.merchant_order_id,
                              payinId: updatedPayInData?.id,
                              amount: updatedPayInData?.confirmed,
                              req_amount: updatedPayInData?.amount,
                              utr_id: updatedPayInData?.utr,
                            }
                            //When we get the notify url we will add it.
                            logger.info('Sending notification to merchant', { notify_url: updatedPayInData.notify_url, notify_data: notifyData });
                            const notifyMerchant = await axios.post(updatedPayInData.notify_url, notifyData);
                            logger.info('Sending notification to merchant', {
                              status: notifyMerchant.status,
                              data: notifyMerchant.data,
                            })
                          } catch (error) {
                            console.error("Error sending notification to merchant:", error);
                          }
                          return res.status(200).json({ message: "true" });
                        }
                        else {
                          await sendErrorMessageUtrMismatchTelegramBot(
                            message.chat.id,
                            getPayInData?.user_submitted_utr,
                            dataRes?.utr,
                            TELEGRAM_BOT_TOKEN,
                            message?.message_id
                          );
                          return res.status(200).json({ message: "Utr mismatch" });
                        }
                      }
                      else {
                        const payinCommission = calculateCommission(
                          dataRes?.amount,
                          getPayInData.Merchant?.payin_commission
                        );
  
                        const durMs = new Date() - getPayInData.createdAt;
                        const durSeconds = Math.floor((durMs / 1000) % 60).toString().padStart(2, '0');
                        const durMinutes = Math.floor((durSeconds / 60) % 60).toString().padStart(2, '0');
                        const durHours = Math.floor((durMinutes / 60) % 24).toString().padStart(2, '0');
                        const duration = `${durHours}:${durMinutes}:${durSeconds}`;
  
                        updatePayInData = {
                          confirmed: dataRes?.amount,
                          status: "SUCCESS",
                          is_notified: true,
                          utr: dataRes.utr,
                          approved_at: new Date(),
                          is_url_expires: true,
                          payin_commission: payinCommission,
                          user_submitted_image: null,
                          duration: duration,
  
                        };
                        const updatedPayInData = await payInRepo.updatePayInData(
                          getPayInData?.id,
                          updatePayInData
                        );
  
                        await botResponseRepo.updateBotResponseByUtr(
                          getTelegramResByUtr?.id,
                          getTelegramResByUtr?.utr
                        );
  
                        await sendSuccessMessageTelegram(
                          message.chat.id,
                          merchantOrderIdTele,
                          TELEGRAM_BOT_TOKEN,
                          message?.message_id
                        );
  
                        // ----> Notify url
                        try {
  
                          const notifyData = {
                            status: "SUCCESS",
                            merchantOrderId: updatedPayInData?.merchant_order_id,
                            payinId: updatedPayInData?.id,
                            amount: updatedPayInData?.confirmed,
                            req_amount: updatedPayInData?.amount,
                            utr_id: updatedPayInData?.utr,
                          }
                          //When we get the notify url we will add it.
                          logger.info('Sending notification to merchant', { notify_url: updatedPayInData.notify_url, notify_data: notifyData });
                          const notifyMerchant = await axios.post(updatedPayInData.notify_url, notifyData);
                          logger.info('Sending notification to merchant', {
                            status: notifyMerchant.status,
                            data: notifyMerchant.data,
                          })
                        } catch (error) {
                          console.error("Error sending notification to merchant:", error);
                        }
                        return res.status(200).json({ message: "true" });
                      }
                    } else {
                      if (getPayInData?.user_submitted_utr) {
                        if (getPayInData?.user_submitted_utr === dataRes?.utr) {
                          const payinCommission = calculateCommission(
                            dataRes?.amount,
                            getPayInData.Merchant?.payin_commission
                          );
    
                          const durMs = new Date() - getPayInData.createdAt;
                          const durSeconds = Math.floor((durMs / 1000) % 60).toString().padStart(2, '0');
                          const durMinutes = Math.floor((durSeconds / 60) % 60).toString().padStart(2, '0');
                          const durHours = Math.floor((durMinutes / 60) % 24).toString().padStart(2, '0');
                          const duration = `${durHours}:${durMinutes}:${durSeconds}`;
    
                          updatePayInData = {
                            confirmed: getTelegramResByUtr?.amount,
                            status: "DISPUTE",
                            is_notified: true,
                            utr: dataRes.utr,
                            approved_at: new Date(),
                            is_url_expires: true,
                            payin_commission: payinCommission,
                            user_submitted_image: null,
                            duration: duration
                          };
                          const updatedPayInData = await payInRepo.updatePayInData(
                            getPayInData?.id,
                            updatePayInData
                          );
                          await botResponseRepo.updateBotResponseByUtr(
                            getTelegramResByUtr?.id,
                            getTelegramResByUtr?.utr
                          );
                          await sendAmountDisputeMessageTelegramBot(
                            message.chat.id,
                            getTelegramResByUtr?.amount,
                            getPayInData?.amount,
                            TELEGRAM_BOT_TOKEN,
                            message?.message_id
                          );
                          // Notify url--->
                          const notifyData = {
                            status: "DISPUTE",
                            merchantOrderId: updatedPayInData?.merchant_order_id,
                            payinId: updatedPayInData?.id,
                            amount: updatedPayInData?.confirmed,
                            req_amount: updatedPayInData?.amount,
                            utr_id: updatedPayInData?.utr
                          }
                          try {
                            //When we get the notify url we will add it.
                            logger.info('Sending notification to merchant', { notify_url: updatedPayInData.notify_url, notify_data: notifyData });
    
                            const notifyMerchant = await axios.post(updatedPayInData.notify_url, notifyData);
                            logger.info('Sending notification to merchant', {
                              status: notifyMerchant.status,
                              data: notifyMerchant.data,
                            })
                          } catch (error) {
                            console.error("Error sending notification:", error);
                          }
    
                          return res.status(200).json({ message: "true" });
                        }
                        else {
                          await sendErrorMessageUtrMismatchTelegramBot(
                            message.chat.id,
                            getPayInData?.user_submitted_utr,
                            dataRes?.utr,
                            TELEGRAM_BOT_TOKEN,
                            message?.message_id
                          );
                          return res.status(200).json({ message: "Utr mismatch" });
                        }
                      }
                      else {
                        const payinCommission = calculateCommission(
                          dataRes?.amount,
                          getPayInData.Merchant?.payin_commission
                        );
  
                        const durMs = new Date() - getPayInData.createdAt;
                        const durSeconds = Math.floor((durMs / 1000) % 60).toString().padStart(2, '0');
                        const durMinutes = Math.floor((durSeconds / 60) % 60).toString().padStart(2, '0');
                        const durHours = Math.floor((durMinutes / 60) % 24).toString().padStart(2, '0');
                        const duration = `${durHours}:${durMinutes}:${durSeconds}`;
  
                        updatePayInData = {
                          confirmed: getTelegramResByUtr?.amount,
                          status: "DISPUTE",
                          is_notified: true,
                          utr: dataRes.utr,
                          approved_at: new Date(),
                          is_url_expires: true,
                          payin_commission: payinCommission,
                          user_submitted_image: null,
                          duration: duration
                        };
                        const updatedPayInData = await payInRepo.updatePayInData(
                          getPayInData?.id,
                          updatePayInData
                        );
                        await botResponseRepo.updateBotResponseByUtr(
                          getTelegramResByUtr?.id,
                          getTelegramResByUtr?.utr
                        );
                        await sendAmountDisputeMessageTelegramBot(
                          message.chat.id,
                          getTelegramResByUtr?.amount,
                          getPayInData?.amount,
                          TELEGRAM_BOT_TOKEN,
                          message?.message_id
                        );
                        // Notify url--->
                        const notifyData = {
                          status: "DISPUTE",
                          merchantOrderId: updatedPayInData?.merchant_order_id,
                          payinId: updatedPayInData?.id,
                          amount: updatedPayInData?.confirmed,
                          req_amount: updatedPayInData?.amount,
                          utr_id: updatedPayInData?.utr
                        }
                        try {
                          //When we get the notify url we will add it.
                          logger.info('Sending notification to merchant', { notify_url: updatedPayInData.notify_url, notify_data: notifyData });
  
                          const notifyMerchant = await axios.post(updatedPayInData.notify_url, notifyData);
                          logger.info('Sending notification to merchant', {
                            status: notifyMerchant.status,
                            data: notifyMerchant.data,
                          })
                        } catch (error) {
                          console.error("Error sending notification:", error);
                        }
  
                        return res.status(200).json({ message: "true" });
                      }
                    }

                  } else {
                    await sendErrorMessageUtrNotFoundTelegramBot(
                      message.chat.id,
                      dataRes?.utr,
                      TELEGRAM_BOT_TOKEN,
                      message?.message_id
                    );
                    return res.status(200).json({ message: "Utr does not exist" });
                  }

                } else {
                  const statusActions = {
                    SUCCESS: async () => {
                      await sendSuccessMessageTelegram(
                        message.chat.id,
                        merchantOrderIdTele,
                        TELEGRAM_BOT_TOKEN,
                        message?.message_id
                      );
                    },
                    DUPLICATE: async () => {
                      let existingPayinData
                      existingPayinData = await payInRepo.getPayinDataByUsrSubmittedUtr(dataRes?.utr);
                      if (existingPayinData.length == 0) {
                        existingPayinData = await payInRepo.getPayinDataByUtr(dataRes?.utr);
                      }
                      await sendAlreadyConfirmedMessageTelegramBot(
                        message.chat.id,
                        dataRes?.utr,
                        TELEGRAM_BOT_TOKEN,
                        message?.message_id,
                        existingPayinData
                      );
                    },
                    DISPUTE: async () => {
                      await sendAmountDisputeMessageTelegramBot(
                        message.chat.id,
                        getTelegramResByUtr?.amount,
                        getPayInData?.amount,
                        TELEGRAM_BOT_TOKEN,
                        message?.message_id
                      );
                    },
                    BANK_MISMATCH: async () => {
                      await sendBankMismatchMessageTelegramBot(
                        message.chat.id,
                        getTelegramResByUtr?.bankName,
                        getPayInData?.bank_name,
                        TELEGRAM_BOT_TOKEN,
                        message?.message_id
                      );
                    }
                  };

                  if (getPayInData?.status in statusActions) {
                    await statusActions[getPayInData.status]();
                  }
                  else {
                    const getTelegramResByUtr = await botResponseRepo.getBotResByUtr(
                      dataRes?.utr
                    );
                    if (!getTelegramResByUtr) {
                      await sendErrorMessageUtrNotFoundTelegramBot(
                        message.chat.id,
                        dataRes?.utr,
                        TELEGRAM_BOT_TOKEN,
                        message?.message_id
                      );
                      return res.status(200).json({ message: "Utr does not exist" });
                    }

                    if (getTelegramResByUtr?.is_used === true) {
                      let existingPayinData;
                      existingPayinData = await payInRepo.getPayinDataByUsrSubmittedUtr(dataRes?.utr);
                      if (existingPayinData.length === 0) {
                        existingPayinData = await payInRepo.getPayinDataByUtr(dataRes?.utr);
                      }

                      await sendAlreadyConfirmedMessageTelegramBot(
                        message.chat.id,
                        dataRes?.utr,
                        TELEGRAM_BOT_TOKEN,
                        message?.message_id,
                        existingPayinData
                      );
                      return res.status(200).json({ message: "Utr is already used" });
                    }

                    if (
                      dataRes?.utr === getTelegramResByUtr?.utr &&
                      parseFloat(dataRes?.amount) ===
                      parseFloat(getTelegramResByUtr?.amount)
                    ) {

                      if (
                        parseFloat(getPayInData?.amount) === parseFloat(dataRes?.amount)
                      ) {

                        const isUsrSubmittedUtrUsed =
                          await payInRepo?.getPayinDataByUsrSubmittedUtr(dataRes?.utr);

                        if (isUsrSubmittedUtrUsed.length > 0) {

                          const payinCommission = calculateCommission(
                            dataRes?.amount,
                            getPayInData.Merchant?.payin_commission
                          );

                          const durMs = new Date() - getPayInData.createdAt;
                          const durSeconds = Math.floor((durMs / 1000) % 60).toString().padStart(2, '0');
                          const durMinutes = Math.floor((durSeconds / 60) % 60).toString().padStart(2, '0');
                          const durHours = Math.floor((durMinutes / 60) % 24).toString().padStart(2, '0');
                          const duration = `${durHours}:${durMinutes}:${durSeconds}`;

                          updatePayInData = {
                            status: "DUPLICATE",
                            is_notified: true,
                            utr: dataRes.utr,
                            approved_at: new Date(),
                            is_url_expires: true,
                            payin_commission: payinCommission,
                            user_submitted_image: null,
                            duration: duration
                          };
                          const updatedPayInData = await payInRepo.updatePayInData(
                            getPayInData?.id,
                            updatePayInData
                          );
                          await botResponseRepo.updateBotResponseByUtr(
                            getTelegramResByUtr?.id,
                            getTelegramResByUtr?.utr
                          );

                          let existingPayinData
                          existingPayinData = await payInRepo.getPayinDataByUsrSubmittedUtr(dataRes?.utr);
                          if (existingPayinData.length == 0) {
                            existingPayinData = await payInRepo.getPayinDataByUtr(dataRes?.utr);
                          }

                          await sendAlreadyConfirmedMessageTelegramBot(
                            message.chat.id,
                            dataRes?.utr,
                            TELEGRAM_BOT_TOKEN,
                            message?.message_id,
                            existingPayinData
                          );

                          // Notify url--->
                          const notifyData = {
                            status: "DUPLICATE",
                            merchantOrderId: updatedPayInData?.merchant_order_id,
                            payinId: updatedPayInData?.id,
                            amount: updatedPayInData?.confirmed,
                            req_amount: updatedPayInData?.amount,
                            utr_id: updatedPayInData?.utr,
                            duration: duration
                          }
                          try {
                            //When we get the notify url we will add it.
                            logger.info('Sending notification to merchant', { notify_url: updatedPayInData.notify_url, notify_data: notifyData });

                            const notifyMerchant = await axios.post(updatedPayInData.notify_url, notifyData);
                            logger.info('Sending notification to merchant', {
                              status: notifyMerchant.status,
                              data: notifyMerchant.data,
                            })
                          } catch (error) {
                            console.error("Error sending notification:", error);
                          }

                          return res.status(200).json({ message: "true" });
                        }
                        else {
                          if (getPayInData?.bank_name !== getTelegramResByUtr?.bankName) {
                            if (getPayInData?.user_submitted_utr) {
                              if (getPayInData?.user_submitted_utr === dataRes?.utr) {
                                if (getTelegramResByUtr?.is_used) {
                                  let existingPayinData
                                  existingPayinData = await payInRepo.getPayinDataByUsrSubmittedUtr(dataRes?.utr);
                                  if (existingPayinData.length == 0) {
                                    existingPayinData = await payInRepo.getPayinDataByUtr(dataRes?.utr);
                                  }
                                  await sendAlreadyConfirmedMessageTelegramBot(
                                    message.chat.id,
                                    dataRes?.utr,
                                    TELEGRAM_BOT_TOKEN,
                                    message?.message_id,
                                    existingPayinData
                                  );
                                  logger.error("Utr is already used Bank MissMatch");
                                  return
                                }
              
                                const payinCommission = calculateCommission(
                                  dataRes?.amount,
                                  getPayInData.Merchant?.payin_commission
                                );
              
                                const durMs = new Date() - getPayInData.createdAt;
                                const durSeconds = Math.floor((durMs / 1000) % 60).toString().padStart(2, '0');
                                const durMinutes = Math.floor((durSeconds / 60) % 60).toString().padStart(2, '0');
                                const durHours = Math.floor((durMinutes / 60) % 24).toString().padStart(2, '0');
                                const duration = `${durHours}:${durMinutes}:${durSeconds}`;
              
                                updatePayInData = {
                                  confirmed: getTelegramResByUtr?.amount,
                                  status: "BANK_MISMATCH",
                                  is_notified: true,
                                  utr: dataRes.utr,
                                  approved_at: new Date(),
                                  is_url_expires: true,
                                  payin_commission: payinCommission,
                                  user_submitted_image: null,
                                  duration: duration
                                };
              
                                const updatedPayInData = await payInRepo.updatePayInData(
                                  getPayInData?.id,
                                  updatePayInData
                                );
              
                                if (getTelegramResByUtr) {
                                  await botResponseRepo.updateBotResponseByUtr(
                                    getTelegramResByUtr?.id,
                                    getTelegramResByUtr?.utr
                                  );
                                }
                                else {
                                  await sendErrorMessageNoDepositFoundTelegramBot(
                                    message.chat.id,
                                    dataRes?.utr,
                                    TELEGRAM_BOT_TOKEN,
                                    message?.message_id
                                  )
                                  return
                                }
              
                                await sendBankMismatchMessageTelegramBot(
                                  message.chat.id,
                                  getTelegramResByUtr?.bankName,
                                  getPayInData?.bank_name,
                                  TELEGRAM_BOT_TOKEN,
                                  message?.message_id
                                );
              
                                // Notify url--->
                                const notifyData = {
                                  status: "BANK_MISMATCH",
                                  merchantOrderId: updatedPayInData?.merchant_order_id,
                                  payinId: updatedPayInData?.id,
                                  amount: updatedPayInData?.confirmed,
                                  req_amount: updatedPayInData?.amount,
                                  utr_id: updatedPayInData?.utr
                                }
                                try {
                                  //When we get the notify url we will add it.
                                  logger.info('Sending notification to merchant', { notify_url: updatedPayInData.notify_url, notify_data: notifyData });
              
                                  const notifyMerchant = await axios.post(updatedPayInData.notify_url, notifyData);
                                  logger.info('Sending notification to merchant', {
                                    status: notifyMerchant.status,
                                    data: notifyMerchant.data,
                                  })
                                } catch (error) {
                                  console.error("Error sending notification:", error);
                                }
              
                                return res.status(200).json({ message: "true" });
                              }
                              else {
                                await sendErrorMessageUtrMismatchTelegramBot(
                                  message.chat.id,
                                  getPayInData?.user_submitted_utr,
                                  dataRes?.utr,
                                  TELEGRAM_BOT_TOKEN,
                                  message?.message_id
                                );
                                return res.status(200).json({ message: "Utr mismatch" });
                              }
                            }
                            else {
                              if (getTelegramResByUtr?.is_used) {
                                let existingPayinData
                                existingPayinData = await payInRepo.getPayinDataByUsrSubmittedUtr(dataRes?.utr);
                                if (existingPayinData.length == 0) {
                                  existingPayinData = await payInRepo.getPayinDataByUtr(dataRes?.utr);
                                }
                                await sendAlreadyConfirmedMessageTelegramBot(
                                  message.chat.id,
                                  dataRes?.utr,
                                  TELEGRAM_BOT_TOKEN,
                                  message?.message_id,
                                  existingPayinData
                                );
                                logger.error("Utr is already used Bank MissMatch");
                                return
                              }
            
                              const payinCommission = calculateCommission(
                                dataRes?.amount,
                                getPayInData.Merchant?.payin_commission
                              );
            
                              const durMs = new Date() - getPayInData.createdAt;
                              const durSeconds = Math.floor((durMs / 1000) % 60).toString().padStart(2, '0');
                              const durMinutes = Math.floor((durSeconds / 60) % 60).toString().padStart(2, '0');
                              const durHours = Math.floor((durMinutes / 60) % 24).toString().padStart(2, '0');
                              const duration = `${durHours}:${durMinutes}:${durSeconds}`;
            
                              updatePayInData = {
                                confirmed: getTelegramResByUtr?.amount,
                                status: "BANK_MISMATCH",
                                is_notified: true,
                                utr: dataRes.utr,
                                approved_at: new Date(),
                                is_url_expires: true,
                                payin_commission: payinCommission,
                                user_submitted_image: null,
                                duration: duration
                              };
            
                              const updatedPayInData = await payInRepo.updatePayInData(
                                getPayInData?.id,
                                updatePayInData
                              );
            
                              if (getTelegramResByUtr) {
                                await botResponseRepo.updateBotResponseByUtr(
                                  getTelegramResByUtr?.id,
                                  getTelegramResByUtr?.utr
                                );
                              }
                              else {
                                await sendErrorMessageNoDepositFoundTelegramBot(
                                  message.chat.id,
                                  dataRes?.utr,
                                  TELEGRAM_BOT_TOKEN,
                                  message?.message_id
                                )
                                return
                              }
            
                              await sendBankMismatchMessageTelegramBot(
                                message.chat.id,
                                getTelegramResByUtr?.bankName,
                                getPayInData?.bank_name,
                                TELEGRAM_BOT_TOKEN,
                                message?.message_id
                              );
            
                              // Notify url--->
                              const notifyData = {
                                status: "BANK_MISMATCH",
                                merchantOrderId: updatedPayInData?.merchant_order_id,
                                payinId: updatedPayInData?.id,
                                amount: updatedPayInData?.confirmed,
                                req_amount: updatedPayInData?.amount,
                                utr_id: updatedPayInData?.utr
                              }
                              try {
                                //When we get the notify url we will add it.
                                logger.info('Sending notification to merchant', { notify_url: updatedPayInData.notify_url, notify_data: notifyData });
            
                                const notifyMerchant = await axios.post(updatedPayInData.notify_url, notifyData);
                                logger.info('Sending notification to merchant', {
                                  status: notifyMerchant.status,
                                  data: notifyMerchant.data,
                                })
                              } catch (error) {
                                console.error("Error sending notification:", error);
                              }
            
                              return res.status(200).json({ message: "true" });
                            }
                          } else {
                            if (getPayInData?.user_submitted_utr) {
                              if (getPayInData?.user_submitted_utr === dataRes?.utr) {
                                const payinCommission = calculateCommission(
                                  dataRes?.amount,
                                  getPayInData.Merchant?.payin_commission
                                );
          
                                const durMs = new Date() - getPayInData.createdAt;
                                const durSeconds = Math.floor((durMs / 1000) % 60).toString().padStart(2, '0');
                                const durMinutes = Math.floor((durSeconds / 60) % 60).toString().padStart(2, '0');
                                const durHours = Math.floor((durMinutes / 60) % 24).toString().padStart(2, '0');
                                const duration = `${durHours}:${durMinutes}:${durSeconds}`;
          
                                updatePayInData = {
                                  confirmed: dataRes?.amount,
                                  status: "SUCCESS",
                                  is_notified: true,
                                  utr: dataRes.utr,
                                  approved_at: new Date(),
                                  is_url_expires: true,
                                  payin_commission: payinCommission,
                                  user_submitted_image: null,
                                  duration: duration,
          
                                };
                                const updatedPayInData = await payInRepo.updatePayInData(
                                  getPayInData?.id,
                                  updatePayInData
                                );
          
                                await botResponseRepo.updateBotResponseByUtr(
                                  getTelegramResByUtr?.id,
                                  getTelegramResByUtr?.utr
                                );
          
                                await sendSuccessMessageTelegram(
                                  message.chat.id,
                                  merchantOrderIdTele,
                                  TELEGRAM_BOT_TOKEN,
                                  message?.message_id
                                );
          
                                // ----> Notify url
                                try {
          
                                  const notifyData = {
                                    status: "SUCCESS",
                                    merchantOrderId: updatedPayInData?.merchant_order_id,
                                    payinId: updatedPayInData?.id,
                                    amount: updatedPayInData?.confirmed,
                                    req_amount: updatedPayInData?.amount,
                                    utr_id: updatedPayInData?.utr,
                                  }
                                  //When we get the notify url we will add it.
                                  logger.info('Sending notification to merchant', { notify_url: updatedPayInData.notify_url, notify_data: notifyData });
                                  const notifyMerchant = await axios.post(updatedPayInData.notify_url, notifyData);
                                  logger.info('Sending notification to merchant', {
                                    status: notifyMerchant.status,
                                    data: notifyMerchant.data,
                                  })
                                } catch (error) {
                                  console.error("Error sending notification to merchant:", error);
                                }
                                return res.status(200).json({ message: "true" });
                              }
                              else {
                                await sendErrorMessageUtrMismatchTelegramBot(
                                  message.chat.id,
                                  getPayInData?.user_submitted_utr,
                                  dataRes?.utr,
                                  TELEGRAM_BOT_TOKEN,
                                  message?.message_id
                                );
                                return res.status(200).json({ message: "Utr mismatch" });
                              }
                            }
                            else {
                              const payinCommission = calculateCommission(
                                dataRes?.amount,
                                getPayInData.Merchant?.payin_commission
                              );
        
                              const durMs = new Date() - getPayInData.createdAt;
                              const durSeconds = Math.floor((durMs / 1000) % 60).toString().padStart(2, '0');
                              const durMinutes = Math.floor((durSeconds / 60) % 60).toString().padStart(2, '0');
                              const durHours = Math.floor((durMinutes / 60) % 24).toString().padStart(2, '0');
                              const duration = `${durHours}:${durMinutes}:${durSeconds}`;
        
                              updatePayInData = {
                                confirmed: dataRes?.amount,
                                status: "SUCCESS",
                                is_notified: true,
                                utr: dataRes.utr,
                                approved_at: new Date(),
                                is_url_expires: true,
                                payin_commission: payinCommission,
                                user_submitted_image: null,
                                duration: duration,
        
                              };
                              const updatedPayInData = await payInRepo.updatePayInData(
                                getPayInData?.id,
                                updatePayInData
                              );
        
                              await botResponseRepo.updateBotResponseByUtr(
                                getTelegramResByUtr?.id,
                                getTelegramResByUtr?.utr
                              );
        
                              await sendSuccessMessageTelegram(
                                message.chat.id,
                                merchantOrderIdTele,
                                TELEGRAM_BOT_TOKEN,
                                message?.message_id
                              );
        
                              // ----> Notify url
                              try {
        
                                const notifyData = {
                                  status: "SUCCESS",
                                  merchantOrderId: updatedPayInData?.merchant_order_id,
                                  payinId: updatedPayInData?.id,
                                  amount: updatedPayInData?.confirmed,
                                  req_amount: updatedPayInData?.amount,
                                  utr_id: updatedPayInData?.utr,
                                }
                                //When we get the notify url we will add it.
                                logger.info('Sending notification to merchant', { notify_url: updatedPayInData.notify_url, notify_data: notifyData });
                                const notifyMerchant = await axios.post(updatedPayInData.notify_url, notifyData);
                                logger.info('Sending notification to merchant', {
                                  status: notifyMerchant.status,
                                  data: notifyMerchant.data,
                                })
                              } catch (error) {
                                console.error("Error sending notification to merchant:", error);
                              }
                              return res.status(200).json({ message: "true" });
                            }
                          }
                        }
                      }
                      // Dispute Execution Status
                      else {
                        if (getPayInData?.user_submitted_utr) {
                          if (getPayInData?.user_submitted_utr === dataRes?.utr) {
                            const payinCommission = calculateCommission(
                              dataRes?.amount,
                              getPayInData.Merchant?.payin_commission
                            );
      
                            const durMs = new Date() - getPayInData.createdAt;
                            const durSeconds = Math.floor((durMs / 1000) % 60).toString().padStart(2, '0');
                            const durMinutes = Math.floor((durSeconds / 60) % 60).toString().padStart(2, '0');
                            const durHours = Math.floor((durMinutes / 60) % 24).toString().padStart(2, '0');
                            const duration = `${durHours}:${durMinutes}:${durSeconds}`;
      
                            updatePayInData = {
                              confirmed: getTelegramResByUtr?.amount,
                              status: "DISPUTE",
                              is_notified: true,
                              utr: dataRes.utr,
                              approved_at: new Date(),
                              is_url_expires: true,
                              payin_commission: payinCommission,
                              user_submitted_image: null,
                              duration: duration
                            };
                            const updatedPayInData = await payInRepo.updatePayInData(
                              getPayInData?.id,
                              updatePayInData
                            );
                            await botResponseRepo.updateBotResponseByUtr(
                              getTelegramResByUtr?.id,
                              getTelegramResByUtr?.utr
                            );
                            await sendAmountDisputeMessageTelegramBot(
                              message.chat.id,
                              getTelegramResByUtr?.amount,
                              getPayInData?.amount,
                              TELEGRAM_BOT_TOKEN,
                              message?.message_id
                            );
                            // Notify url--->
                            const notifyData = {
                              status: "DISPUTE",
                              merchantOrderId: updatedPayInData?.merchant_order_id,
                              payinId: updatedPayInData?.id,
                              amount: updatedPayInData?.confirmed,
                              req_amount: updatedPayInData?.amount,
                              utr_id: updatedPayInData?.utr
                            }
                            try {
                              //When we get the notify url we will add it.
                              logger.info('Sending notification to merchant', { notify_url: updatedPayInData.notify_url, notify_data: notifyData });
      
                              const notifyMerchant = await axios.post(updatedPayInData.notify_url, notifyData);
                              logger.info('Sending notification to merchant', {
                                status: notifyMerchant.status,
                                data: notifyMerchant.data,
                              })
                            } catch (error) {
                              console.error("Error sending notification:", error);
                            }
      
                            return res.status(200).json({ message: "true" });
                          }
                          else {
                            await sendErrorMessageUtrMismatchTelegramBot(
                              message.chat.id,
                              getPayInData?.user_submitted_utr,
                              dataRes?.utr,
                              TELEGRAM_BOT_TOKEN,
                              message?.message_id
                            );
                            return res.status(200).json({ message: "Utr mismatch" });
                          }
                        }
                        else {
                          const payinCommission = calculateCommission(
                            dataRes?.amount,
                            getPayInData.Merchant?.payin_commission
                          );
    
                          const durMs = new Date() - getPayInData.createdAt;
                          const durSeconds = Math.floor((durMs / 1000) % 60).toString().padStart(2, '0');
                          const durMinutes = Math.floor((durSeconds / 60) % 60).toString().padStart(2, '0');
                          const durHours = Math.floor((durMinutes / 60) % 24).toString().padStart(2, '0');
                          const duration = `${durHours}:${durMinutes}:${durSeconds}`;
    
                          updatePayInData = {
                            confirmed: getTelegramResByUtr?.amount,
                            status: "DISPUTE",
                            is_notified: true,
                            utr: dataRes.utr,
                            approved_at: new Date(),
                            is_url_expires: true,
                            payin_commission: payinCommission,
                            user_submitted_image: null,
                            duration: duration
                          };
                          const updatedPayInData = await payInRepo.updatePayInData(
                            getPayInData?.id,
                            updatePayInData
                          );
                          await botResponseRepo.updateBotResponseByUtr(
                            getTelegramResByUtr?.id,
                            getTelegramResByUtr?.utr
                          );
                          await sendAmountDisputeMessageTelegramBot(
                            message.chat.id,
                            getTelegramResByUtr?.amount,
                            getPayInData?.amount,
                            TELEGRAM_BOT_TOKEN,
                            message?.message_id
                          );
                          // Notify url--->
                          const notifyData = {
                            status: "DISPUTE",
                            merchantOrderId: updatedPayInData?.merchant_order_id,
                            payinId: updatedPayInData?.id,
                            amount: updatedPayInData?.confirmed,
                            req_amount: updatedPayInData?.amount,
                            utr_id: updatedPayInData?.utr
                          }
                          try {
                            //When we get the notify url we will add it.
                            logger.info('Sending notification to merchant', { notify_url: updatedPayInData.notify_url, notify_data: notifyData });
    
                            const notifyMerchant = await axios.post(updatedPayInData.notify_url, notifyData);
                            logger.info('Sending notification to merchant', {
                              status: notifyMerchant.status,
                              data: notifyMerchant.data,
                            })
                          } catch (error) {
                            console.error("Error sending notification:", error);
                          }
    
                          return res.status(200).json({ message: "true" });
                        }
                      }

                    } else {
                      await sendErrorMessageNoDepositFoundTelegramBot(
                        message.chat.id,
                        dataRes?.utr,
                        TELEGRAM_BOT_TOKEN,
                        message?.message_id
                      );
                      return res.status(200).json({ message: "Utr does not exist" });
                    }
                  }
                }
              }
              else {
                await sendErrorMessageNoMerchantOrderIdFoundTelegramBot(
                  message.chat.id,
                  TELEGRAM_BOT_TOKEN,
                  message?.message_id
                );
                return res.status(200).json({ message: "Please enter merchant orderId" });
              }
            } else {
              await sendErrorMessageUtrOrAmountNotFoundImgTelegramBot(
                message.chat.id,
                TELEGRAM_BOT_TOKEN,
                message?.message_id
              );
              return res
                .status(200)
                .json({ message: "Utr or Amount not recognized" });
            }
          } else {
            await sendErrorMessageUtrOrAmountNotFoundImgTelegramBot(
              message.chat.id,
              TELEGRAM_BOT_TOKEN,
              message?.message_id
            );
            return res
              .status(200)
              .json({ message: "Utr or Amount not recognized" });
          }
        } else {
          logger.error("No photo in the message");
          return
        }
      } else {
        logger.error("No message Found");
        return
      }
    } catch (error) {
      next(error);
    }
  }

  async telegramCheckUtrHandler(req, res, next) {
    const TELEGRAM_BOT_TOKEN = config?.telegramCheckUtrBotToken;
    try {
      const { message, fromUI } = req.body;
      const data = message?.text ? message?.text : message?.caption;
      if (!fromUI) {
        res.sendStatus(200);
      }
      else {
        await sendCheckUTRHistoryTelegramMessage(
          config?.telegramCheckUTRHistoryChatId,
          data,
          config?.telegramBotToken,
        );
      }

      if (data) {
        const splitData = data.split(" ");

        const command = splitData[0];
        const merchantOrderId = splitData[1];
        const utr = splitData[2];

        if (command === '/checkutr') {

          if (merchantOrderId === undefined) {
            const response = await sendErrorMessageNoMerchantOrderIdFoundTelegramBot(
              message?.chat?.id,
              TELEGRAM_BOT_TOKEN,
              message?.message_id,
              true, // this check for message according to captions only
              fromUI
            );
            logger.error("Please enter merchant orderId");
            if (!fromUI) {
              return;
            }
            else {
              return res.status(200).json({ message: response });
            }
          }

          if (utr === undefined) {
            const response = await sendErrorMessageNoDepositFoundTelegramBot(
              message?.chat?.id,
              utr,
              TELEGRAM_BOT_TOKEN,
              message?.message_id,
              fromUI
            );
            logger.error("Please enter UTR");
            if (!fromUI) {
              return;
            }
            else {
              return res.status(200).json({ message: response });
            }
          }

          if (merchantOrderId && utr) {
            const getBankResponseByUtr = await botResponseRepo.getBotResByUtr(
              utr
            );

            if (!getBankResponseByUtr) {
              const response = await sendErrorMessageNoDepositFoundTelegramBot(
                message?.chat?.id,
                utr,
                TELEGRAM_BOT_TOKEN,
                message?.message_id,
                fromUI
              );
              logger.error("Utr does not exist");
              if (!fromUI) {
                return;
              }
              else {
                return res.status(200).json({ message: response });
              }
            }

            const getPayInData = await payInRepo.getPayInDataByMerchantOrderId(
              merchantOrderId
            );

            let getPayInDataByUtr;
            getPayInDataByUtr = await payInRepo.getPayinDataByUsrSubmittedUtr(utr);
            if (getPayInDataByUtr.length === 0) {
              getPayInDataByUtr = await payInRepo.getPayinDataByUtr(utr);
            }

            if (!getPayInData) {
              const response = await sendErrorMessageTelegram(
                message?.chat?.id,
                merchantOrderId,
                TELEGRAM_BOT_TOKEN,
                message?.message_id,
                fromUI
              );
              logger.error("Merchant order id does not exist");
              if (!fromUI) {
                return;
              }
              else {
                return res.status(200).json({ message: response });
              }
            }
            if (getPayInDataByUtr?.status === 'SUCCESS') {
              let existingPayinData;
              existingPayinData = await payInRepo.getPayinDataByUsrSubmittedUtr(getBankResponseByUtr?.utr);
              if (existingPayinData.length === 0) {
                existingPayinData = await payInRepo.getPayinDataByUtr(getBankResponseByUtr?.utr);
              }
              const response = await sendAlreadyConfirmedMessageTelegramBot(
                message?.chat?.id,
                getBankResponseByUtr?.utr,
                TELEGRAM_BOT_TOKEN,
                message?.message_id,
                existingPayinData,
                fromUI
              );
              logger.error("Utr is already confirmed");
              if (!fromUI) {
                return;
              }
              else {
                return res.status(200).json({ message: response });
              }
            }
            let updatePayInData;
            if (getPayInData && (getPayInData?.status === "PENDING" || getPayInData?.status === "DROPPED" || getPayInData?.status === "ASSIGNED" || (getPayInData.status === 'DUPLICATE' && !getBankResponseByUtr.is_used && getPayInData.user_submitted_utr !== utr))) {
              if (getBankResponseByUtr?.bankName !== getPayInData?.bank_name) {

                let isUsrSubmittedUtrUsed
                isUsrSubmittedUtrUsed =
                  await payInRepo?.getPayinDataByUsrSubmittedUtr(utr);
                if (isUsrSubmittedUtrUsed.length === 0) {
                  isUsrSubmittedUtrUsed =
                    await payInRepo?.getPayinDataByUtr(utr);
                }

                if (isUsrSubmittedUtrUsed.length > 0) {

                  let existingPayinData;
                  existingPayinData = await payInRepo.getPayinDataByUsrSubmittedUtr(getBankResponseByUtr?.utr);
                  if (existingPayinData.length === 0) {
                    existingPayinData = await payInRepo.getPayinDataByUtr(getBankResponseByUtr?.utr);
                  }
                  const response = await sendAlreadyConfirmedMessageTelegramBot(
                    message?.chat?.id,
                    getBankResponseByUtr?.utr,
                    TELEGRAM_BOT_TOKEN,
                    message?.message_id,
                    existingPayinData,
                    fromUI
                  );
                  logger.error("Utr is already confirmed");
                  if (!fromUI) {
                    return;
                  }
                  else {
                    return res.status(200).json({ message: response });
                  }
                } else {
                  if (getPayInData?.user_submitted_utr) {
                    if (getPayInData?.user_submitted_utr === getBankResponseByUtr.utr) {
                      const payinCommission = calculateCommission(
                        getBankResponseByUtr?.amount,
                        getPayInData.Merchant?.payin_commission
                      );
                      const durMs = new Date() - getPayInData.createdAt;
                      const durSeconds = Math.floor((durMs / 1000) % 60).toString().padStart(2, '0');
                      const durMinutes = Math.floor((durSeconds / 60) % 60).toString().padStart(2, '0');
                      const durHours = Math.floor((durMinutes / 60) % 24).toString().padStart(2, '0');
                      const duration = `${durHours}:${durMinutes}:${durSeconds}`;
    
                      updatePayInData = {
                        confirmed: getBankResponseByUtr?.amount,
                        status: "BANK_MISMATCH",
                        is_notified: true,
                        utr: getBankResponseByUtr.utr,
                        approved_at: new Date(),
                        is_url_expires: true,
                        payin_commission: payinCommission,
                        user_submitted_image: null,
                        duration: duration
                      };
    
                      const updatePayInDataRes = await payInRepo.updatePayInData(
                        getPayInData?.id,
                        updatePayInData
                      );
    
                      await botResponseRepo.updateBotResponseByUtr(
                        getBankResponseByUtr?.id,
                        getBankResponseByUtr?.utr
                      );
    
                      const response = await sendBankMismatchMessageTelegramBot(
                        message?.chat?.id,
                        getBankResponseByUtr?.bankName,
                        getPayInData?.bank_name,
                        TELEGRAM_BOT_TOKEN,
                        message?.message_id,
                        fromUI
                      );
    
                      // Notify url--->
                      const notifyData = {
                        status: "BANK_MISMATCH",
                        merchantOrderId: updatePayInDataRes?.merchant_order_id,
                        payinId: updatePayInDataRes?.id,
                        amount: updatePayInDataRes?.confirmed,
                        req_amount: updatePayInDataRes?.amount,
                        utr_id: updatePayInDataRes?.utr
                      }
                      try {
                        //When we get the notify url we will add it.
                        logger.info('Sending notification to merchant', { notify_url: updatePayInDataRes.notify_url, notify_data: notifyData });
    
                        const notifyMerchant = await axios.post(updatePayInDataRes.notify_url, notifyData);
                        logger.info('Sending notification to merchant', {
                          status: notifyMerchant.status,
                          data: notifyMerchant.data,
                        })
                      } catch (error) {
                        console.error("Error sending notification:", error);
                      }
    
    
                      if (fromUI) {
                        return res.status(200).json({ message: response });
                      }
                      else {
                        return;
                      }
                    }
                    else {
                      const response = await sendErrorMessageUtrMismatchTelegramBot(
                        message?.chat?.id,
                        getPayInData?.user_submitted_utr,
                        getBankResponseByUtr?.utr,
                        TELEGRAM_BOT_TOKEN,
                        message?.message_id,
                        fromUI 
                      );

                      if (fromUI) {
                        return res.status(200).json({ message: response });
                      }
                      else {
                        return;
                      }
                    }
                  }
                  else {
                    const payinCommission = calculateCommission(
                      getBankResponseByUtr?.amount,
                      getPayInData.Merchant?.payin_commission
                    );
                    const durMs = new Date() - getPayInData.createdAt;
                    const durSeconds = Math.floor((durMs / 1000) % 60).toString().padStart(2, '0');
                    const durMinutes = Math.floor((durSeconds / 60) % 60).toString().padStart(2, '0');
                    const durHours = Math.floor((durMinutes / 60) % 24).toString().padStart(2, '0');
                    const duration = `${durHours}:${durMinutes}:${durSeconds}`;
  
                    updatePayInData = {
                      confirmed: getBankResponseByUtr?.amount,
                      status: "BANK_MISMATCH",
                      is_notified: true,
                      utr: getBankResponseByUtr.utr,
                      approved_at: new Date(),
                      is_url_expires: true,
                      payin_commission: payinCommission,
                      user_submitted_image: null,
                      duration: duration
                    };
  
                    const updatePayInDataRes = await payInRepo.updatePayInData(
                      getPayInData?.id,
                      updatePayInData
                    );
  
                    await botResponseRepo.updateBotResponseByUtr(
                      getBankResponseByUtr?.id,
                      getBankResponseByUtr?.utr
                    );
  
                    const response = await sendBankMismatchMessageTelegramBot(
                      message?.chat?.id,
                      getBankResponseByUtr?.bankName,
                      getPayInData?.bank_name,
                      TELEGRAM_BOT_TOKEN,
                      message?.message_id,
                      fromUI
                    );
  
                    // Notify url--->
                    const notifyData = {
                      status: "BANK_MISMATCH",
                      merchantOrderId: updatePayInDataRes?.merchant_order_id,
                      payinId: updatePayInDataRes?.id,
                      amount: updatePayInDataRes?.confirmed,
                      req_amount: updatePayInDataRes?.amount,
                      utr_id: updatePayInDataRes?.utr
                    }
                    try {
                      //When we get the notify url we will add it.
                      logger.info('Sending notification to merchant', { notify_url: updatePayInDataRes.notify_url, notify_data: notifyData });
  
                      const notifyMerchant = await axios.post(updatePayInDataRes.notify_url, notifyData);
                      logger.info('Sending notification to merchant', {
                        status: notifyMerchant.status,
                        data: notifyMerchant.data,
                      })
                    } catch (error) {
                      console.error("Error sending notification:", error);
                    }
  
  
                    if (fromUI) {
                      return res.status(200).json({ message: response });
                    }
                    else {
                      return;
                    }
                  }
                }
              }
              const updateUtrIfNull = (getPayInData?.user_submitted_utr && getPayInData.status !== 'DUPLICATE') ? getPayInData?.user_submitted_utr : utr;

              if ((updateUtrIfNull === getBankResponseByUtr?.utr) && (getPayInData?.bank_name === getBankResponseByUtr?.bankName)) {

                if (
                  parseFloat(getPayInData?.amount) === parseFloat(getBankResponseByUtr?.amount)
                ) {

                  let isUsrSubmittedUtrUsed
                  isUsrSubmittedUtrUsed =
                    await payInRepo?.getPayinDataByUsrSubmittedUtr(utr);
                  if (isUsrSubmittedUtrUsed.length === 0) {
                    isUsrSubmittedUtrUsed =
                      await payInRepo?.getPayinDataByUtr(utr);
                  }

                  if (isUsrSubmittedUtrUsed.length > 0) {

                    const payinCommission = calculateCommission(
                      getBankResponseByUtr?.amount,
                      getPayInData.Merchant?.payin_commission
                    );

                    const durMs = new Date() - getPayInData.createdAt;
                    const durSeconds = Math.floor((durMs / 1000) % 60).toString().padStart(2, '0');
                    const durMinutes = Math.floor((durSeconds / 60) % 60).toString().padStart(2, '0');
                    const durHours = Math.floor((durMinutes / 60) % 24).toString().padStart(2, '0');
                    const duration = `${durHours}:${durMinutes}:${durSeconds}`;

                    updatePayInData = {
                      status: "DUPLICATE",
                      is_notified: true,
                      utr: getBankResponseByUtr?.utr,
                      approved_at: new Date(),
                      is_url_expires: true,
                      payin_commission: payinCommission,
                      user_submitted_image: null,
                      duration: duration
                    };

                    // maybe need to uncomment this

                    // const updatePayInDataRes = await payInRepo.updatePayInData(
                    //   getPayInData?.id,
                    //   updatePayInData
                    // );
                    await botResponseRepo.updateBotResponseByUtr(
                      getBankResponseByUtr?.id,
                      getBankResponseByUtr?.utr
                    );

                    let existingPayinData;
                    existingPayinData = await payInRepo.getPayinDataByUsrSubmittedUtr(getBankResponseByUtr?.utr);
                    if (existingPayinData.length === 0) {
                      existingPayinData = await payInRepo.getPayinDataByUtr(getBankResponseByUtr?.utr);
                    }
                    const response = await sendAlreadyConfirmedMessageTelegramBot(
                      message?.chat?.id,
                      getBankResponseByUtr?.utr,
                      TELEGRAM_BOT_TOKEN,
                      message?.message_id,
                      existingPayinData,
                      fromUI
                    );

                    // Notify url--->
                    const notifyData = {
                      status: "DUPLICATE",
                      merchantOrderId: getPayInData?.merchant_order_id,
                      payinId: getPayInData?.id,
                      amount: getPayInData?.confirmed,
                      req_amount: getPayInData?.amount,
                      utr_id: getPayInData?.utr
                    }
                    try {
                      //When we get the notify url we will add it.
                      logger.info('Sending notification to merchant', { notify_url: getPayInData.notify_url, notify_data: notifyData });

                      const notifyMerchant = await axios.post(getPayInData.notify_url, notifyData);
                      logger.info('Sending notification to merchant', {
                        status: notifyMerchant.status,
                        data: notifyMerchant.data,
                      })
                    } catch (error) {
                      console.error("Error sending notification:", error);
                    }


                    if (fromUI) {
                      return res.status(200).json({ message: response });
                    }
                    else {
                      return
                    }
                  } else {
                    if (getPayInData?.user_submitted_utr) {
                      if (getPayInData?.user_submitted_utr === getBankResponseByUtr.utr) {
                        const payinCommission = calculateCommission(
                          getBankResponseByUtr?.amount,
                          getPayInData.Merchant?.payin_commission
                        );
                        const durMs = new Date() - getPayInData.createdAt;
                        const durSeconds = Math.floor((durMs / 1000) % 60).toString().padStart(2, '0');
                        const durMinutes = Math.floor((durSeconds / 60) % 60).toString().padStart(2, '0');
                        const durHours = Math.floor((durMinutes / 60) % 24).toString().padStart(2, '0');
                        const duration = `${durHours}:${durMinutes}:${durSeconds}`;
      
                        updatePayInData = {
                          confirmed: getBankResponseByUtr?.amount,
                          status: "SUCCESS",
                          is_notified: true,
                          utr: getBankResponseByUtr.utr,
                          approved_at: new Date(),
                          is_url_expires: true,
                          payin_commission: payinCommission,
                          user_submitted_image: null,
                          duration: duration
                        };
                        const updatePayInDataRes = await payInRepo.updatePayInData(
                          getPayInData?.id,
                          updatePayInData
                        );
      
                        await botResponseRepo.updateBotResponseByUtr(
                          getBankResponseByUtr?.id,
                          getBankResponseByUtr?.utr
                        );
      
                        const response = await sendSuccessMessageTelegram(
                          message?.chat?.id,
                          merchantOrderId,
                          TELEGRAM_BOT_TOKEN,
                          message?.message_id,
                          fromUI
                        );
      
                        // ----> Notify url
                        try {
      
                          const notifyData = {
                            status: "SUCCESS",
                            merchantOrderId: updatePayInDataRes?.merchant_order_id,
                            payinId: updatePayInDataRes?.id,
                            amount: updatePayInDataRes?.confirmed,
                            req_amount: updatePayInDataRes?.amount,
                            utr_id: updatePayInDataRes?.utr
                          }
                          //When we get the notify url we will add it.
                          logger.info('Sending notification to merchant', { notify_url: updatePayInDataRes.notify_url, notify_data: notifyData });
                          const notifyMerchant = await axios.post(updatePayInDataRes.notify_url, notifyData);
                          logger.info('Sending notification to merchant', {
                            status: notifyMerchant.status,
                            data: notifyMerchant.data,
                          })
                        } catch (error) {
                          console.error("Error sending notification to merchant:", error);
                        }
                        if (fromUI) {
                          return res.status(200).json({ message: response });
                        }
                        else {
                          return;
                        }
                      }
                      else {
                        const response = await sendErrorMessageUtrMismatchTelegramBot(
                          message?.chat?.id,
                          getPayInData?.user_submitted_utr,
                          getBankResponseByUtr?.utr,
                          TELEGRAM_BOT_TOKEN,
                          message?.message_id,
                          fromUI 
                        );
  
                        if (fromUI) {
                          return res.status(200).json({ message: response });
                        }
                        else {
                          return;
                        }
                      }
                    }
                    else {
                      const payinCommission = calculateCommission(
                        getBankResponseByUtr?.amount,
                        getPayInData.Merchant?.payin_commission
                      );
                      const durMs = new Date() - getPayInData.createdAt;
                      const durSeconds = Math.floor((durMs / 1000) % 60).toString().padStart(2, '0');
                      const durMinutes = Math.floor((durSeconds / 60) % 60).toString().padStart(2, '0');
                      const durHours = Math.floor((durMinutes / 60) % 24).toString().padStart(2, '0');
                      const duration = `${durHours}:${durMinutes}:${durSeconds}`;
    
                      updatePayInData = {
                        confirmed: getBankResponseByUtr?.amount,
                        status: "SUCCESS",
                        is_notified: true,
                        utr: getBankResponseByUtr.utr,
                        approved_at: new Date(),
                        is_url_expires: true,
                        payin_commission: payinCommission,
                        user_submitted_image: null,
                        duration: duration
                      };
                      const updatePayInDataRes = await payInRepo.updatePayInData(
                        getPayInData?.id,
                        updatePayInData
                      );
    
                      await botResponseRepo.updateBotResponseByUtr(
                        getBankResponseByUtr?.id,
                        getBankResponseByUtr?.utr
                      );
    
                      const response = await sendSuccessMessageTelegram(
                        message?.chat?.id,
                        merchantOrderId,
                        TELEGRAM_BOT_TOKEN,
                        message?.message_id,
                        fromUI
                      );
    
                      // ----> Notify url
                      try {
    
                        const notifyData = {
                          status: "SUCCESS",
                          merchantOrderId: updatePayInDataRes?.merchant_order_id,
                          payinId: updatePayInDataRes?.id,
                          amount: updatePayInDataRes?.confirmed,
                          req_amount: updatePayInDataRes?.amount,
                          utr_id: updatePayInDataRes?.utr
                        }
                        //When we get the notify url we will add it.
                        logger.info('Sending notification to merchant', { notify_url: updatePayInDataRes.notify_url, notify_data: notifyData });
                        const notifyMerchant = await axios.post(updatePayInDataRes.notify_url, notifyData);
                        logger.info('Sending notification to merchant', {
                          status: notifyMerchant.status,
                          data: notifyMerchant.data,
                        })
                      } catch (error) {
                        console.error("Error sending notification to merchant:", error);
                      }
                      if (fromUI) {
                        return res.status(200).json({ message: response });
                      }
                      else {
                        return;
                      }
                    }
                  }
                }

                if (
                  parseFloat(getPayInData?.amount) !== parseFloat(getBankResponseByUtr?.amount)
                ) {
                  let isUsrSubmittedUtrUsed
                  isUsrSubmittedUtrUsed =
                    await payInRepo?.getPayinDataByUsrSubmittedUtr(utr);
                  if (isUsrSubmittedUtrUsed.length === 0) {
                    isUsrSubmittedUtrUsed =
                      await payInRepo?.getPayinDataByUtr(utr);
                  }

                  if (isUsrSubmittedUtrUsed.length > 0) {

                    let existingPayinData;
                    existingPayinData = await payInRepo.getPayinDataByUsrSubmittedUtr(getBankResponseByUtr?.utr);
                    if (existingPayinData.length === 0) {
                      existingPayinData = await payInRepo.getPayinDataByUtr(getBankResponseByUtr?.utr);
                    }
                    const response = await sendAlreadyConfirmedMessageTelegramBot(
                      message?.chat?.id,
                      getBankResponseByUtr?.utr,
                      TELEGRAM_BOT_TOKEN,
                      message?.message_id,
                      existingPayinData,
                      fromUI
                    );
                    logger.error("Utr is already confirmed");
                    if (!fromUI) {
                      return;
                    }
                    else {
                      return res.status(200).json({ message: response });
                    }
                  } else {
                    if (getPayInData?.user_submitted_utr) {
                      if (getPayInData?.user_submitted_utr === getBankResponseByUtr.utr) {
                        const payinCommission = calculateCommission(
                          getBankResponseByUtr?.amount,
                          getPayInData.Merchant?.payin_commission
                        );
    
                        const durMs = new Date() - getPayInData?.createdAt;
                        const durSeconds = Math.floor((durMs / 1000) % 60).toString().padStart(2, '0');
                        const durMinutes = Math.floor((durSeconds / 60) % 60).toString().padStart(2, '0');
                        const durHours = Math.floor((durMinutes / 60) % 24).toString().padStart(2, '0');
                        const duration = `${durHours}:${durMinutes}:${durSeconds}`;
    
                        updatePayInData = {
                          confirmed: getBankResponseByUtr?.amount,
                          status: "DISPUTE",
                          is_notified: true,
                          utr: getBankResponseByUtr?.utr,
                          approved_at: new Date(),
                          is_url_expires: true,
                          payin_commission: payinCommission,
                          user_submitted_image: null,
                          duration: duration
                        };
                        const updatePayInDataRes = await payInRepo.updatePayInData(
                          getPayInData?.id,
                          updatePayInData
                        );
                        await botResponseRepo.updateBotResponseByUtr(
                          getBankResponseByUtr?.id,
                          getBankResponseByUtr?.utr
                        );
    
                        const response = await sendAmountDisputeMessageTelegramBot(
                          message?.chat?.id,
                          getBankResponseByUtr?.amount,
                          getPayInData?.amount,
                          TELEGRAM_BOT_TOKEN,
                          message?.message_id,
                          fromUI
                        );
    
                        // Notify url--->
                        const notifyData = {
                          status: "DISPUTE",
                          merchantOrderId: updatePayInDataRes?.merchant_order_id,
                          payinId: updatePayInDataRes?.id,
                          amount: updatePayInDataRes?.confirmed,
                          req_amount: updatePayInDataRes?.amount,
                          utr_id: updatePayInDataRes?.utr
                        }
                        try {
                          //When we get the notify url we will add it.
                          logger.info('Sending notification to merchant', { notify_url: updatePayInDataRes.notify_url, notify_data: notifyData });
    
                          const notifyMerchant = await axios.post(updatePayInDataRes.notify_url, notifyData);
                          logger.info('Sending notification to merchant', {
                            status: notifyMerchant.status,
                            data: notifyMerchant.data,
                          })
                        } catch (error) {
                          console.error("Error sending notification:", error);
                        }
    
                        if (fromUI) {
                          return res.status(200).json({ message: response });
                        }
                        else {
                          return;
                        }
                      }
                      else {
                        const response = await sendErrorMessageUtrMismatchTelegramBot(
                          message?.chat?.id,
                          getPayInData?.user_submitted_utr,
                          getBankResponseByUtr?.utr,
                          TELEGRAM_BOT_TOKEN,
                          message?.message_id,
                          fromUI 
                        );
  
                        if (fromUI) {
                          return res.status(200).json({ message: response });
                        }
                        else {
                          return;
                        }
                      }
                    }
                    else {
                      const payinCommission = calculateCommission(
                        getBankResponseByUtr?.amount,
                        getPayInData.Merchant?.payin_commission
                      );
  
                      const durMs = new Date() - getPayInData?.createdAt;
                      const durSeconds = Math.floor((durMs / 1000) % 60).toString().padStart(2, '0');
                      const durMinutes = Math.floor((durSeconds / 60) % 60).toString().padStart(2, '0');
                      const durHours = Math.floor((durMinutes / 60) % 24).toString().padStart(2, '0');
                      const duration = `${durHours}:${durMinutes}:${durSeconds}`;
  
                      updatePayInData = {
                        confirmed: getBankResponseByUtr?.amount,
                        status: "DISPUTE",
                        is_notified: true,
                        utr: getBankResponseByUtr?.utr,
                        approved_at: new Date(),
                        is_url_expires: true,
                        payin_commission: payinCommission,
                        user_submitted_image: null,
                        duration: duration
                      };
                      const updatePayInDataRes = await payInRepo.updatePayInData(
                        getPayInData?.id,
                        updatePayInData
                      );
                      await botResponseRepo.updateBotResponseByUtr(
                        getBankResponseByUtr?.id,
                        getBankResponseByUtr?.utr
                      );
  
                      const response = await sendAmountDisputeMessageTelegramBot(
                        message?.chat?.id,
                        getBankResponseByUtr?.amount,
                        getPayInData?.amount,
                        TELEGRAM_BOT_TOKEN,
                        message?.message_id,
                        fromUI
                      );
  
                      // Notify url--->
                      const notifyData = {
                        status: "DISPUTE",
                        merchantOrderId: updatePayInDataRes?.merchant_order_id,
                        payinId: updatePayInDataRes?.id,
                        amount: updatePayInDataRes?.confirmed,
                        req_amount: updatePayInDataRes?.amount,
                        utr_id: updatePayInDataRes?.utr
                      }
                      try {
                        //When we get the notify url we will add it.
                        logger.info('Sending notification to merchant', { notify_url: updatePayInDataRes.notify_url, notify_data: notifyData });
  
                        const notifyMerchant = await axios.post(updatePayInDataRes.notify_url, notifyData);
                        logger.info('Sending notification to merchant', {
                          status: notifyMerchant.status,
                          data: notifyMerchant.data,
                        })
                      } catch (error) {
                        console.error("Error sending notification:", error);
                      }
  
                      if (fromUI) {
                        return res.status(200).json({ message: response });
                      }
                      else {
                        return;
                      }
                    }
                  }
                }

              }
            }
            // else if (getPayInData?.status === 'SUCCESS'){
            //   const existingPayinData = await payInRepo.getPayinDataByUsrSubmittedUtr(getBankResponseByUtr?.utr);
            //         await sendAlreadyConfirmedMessageTelegramBot(
            //           message?.chat?.id,
            //           getBankResponseByUtr?.utr,
            //           TELEGRAM_BOT_TOKEN,
            //           message?.message_id,
            //           existingPayinData
            //         );
            //   logger.error("Utr is already confirmed");
            //   return 
            // }

            else if (getPayInData?.is_notified === true) {
              if (getPayInData?.status === 'BANK_MISMATCH') {
                const response = await sendBankMismatchMessageTelegramBot(
                  message?.chat?.id,
                  getBankResponseByUtr?.bankName,
                  getPayInData?.bank_name,
                  TELEGRAM_BOT_TOKEN,
                  message?.message_id,
                  fromUI
                );
                if (fromUI) {
                  return res.status(200).json({ message: response });
                }
              }
              else if (getPayInData?.status === 'DISPUTE') {
                const response = await sendAmountDisputeMessageTelegramBot(
                  message?.chat?.id,
                  getBankResponseByUtr?.amount,
                  getPayInData?.amount,
                  TELEGRAM_BOT_TOKEN,
                  message?.message_id,
                  fromUI
                );
                if (fromUI) {
                  return res.status(200).json({ message: response });
                }
              }
              else {
                let existingPayinData;
                existingPayinData = await payInRepo.getPayinDataByUsrSubmittedUtr(getBankResponseByUtr?.utr);
                if (existingPayinData.length === 0) {
                  existingPayinData = await payInRepo.getPayinDataByUtr(getBankResponseByUtr?.utr);
                }
                const response = await sendAlreadyConfirmedMessageTelegramBot(
                  message?.chat?.id,
                  getBankResponseByUtr?.utr,
                  TELEGRAM_BOT_TOKEN,
                  message?.message_id,
                  existingPayinData,
                  fromUI
                );
                logger.error("Utr is already confirmed");
                if (!fromUI) {
                  return;
                }
                else {
                  return res.status(200).json({ message: response });
                }
              }
            }

            if (getBankResponseByUtr?.is_used === true) {
              let existingPayinData;
              existingPayinData = await payInRepo.getPayinDataByUsrSubmittedUtr(getBankResponseByUtr?.utr);
              if (existingPayinData.length === 0) {
                existingPayinData = await payInRepo.getPayinDataByUtr(getBankResponseByUtr?.utr);
              }
              const response = await sendAlreadyConfirmedMessageTelegramBot(
                message?.chat?.id,
                getBankResponseByUtr?.utr,
                TELEGRAM_BOT_TOKEN,
                message?.message_id,
                existingPayinData,
                fromUI
              );
              logger.error("Utr is already used");
              if (!fromUI) {
                return;
              }
              else {
                return res.status(200).json({ message: response });
              }
            }
            else {
              if (
                parseFloat(getPayInData?.amount) === parseFloat(getBankResponseByUtr?.amount)
              ) {

                let isUsrSubmittedUtrUsed
                isUsrSubmittedUtrUsed =
                  await payInRepo?.getPayinDataByUsrSubmittedUtr(utr);
                if (isUsrSubmittedUtrUsed.length === 0) {
                  isUsrSubmittedUtrUsed =
                    await payInRepo?.getPayinDataByUtr(utr);
                }

                if (isUsrSubmittedUtrUsed.length > 0) {

                  const payinCommission = calculateCommission(
                    getBankResponseByUtr?.amount,
                    getPayInData.Merchant?.payin_commission
                  );

                  const durMs = new Date() - getPayInData.createdAt;
                  const durSeconds = Math.floor((durMs / 1000) % 60).toString().padStart(2, '0');
                  const durMinutes = Math.floor((durSeconds / 60) % 60).toString().padStart(2, '0');
                  const durHours = Math.floor((durMinutes / 60) % 24).toString().padStart(2, '0');
                  const duration = `${durHours}:${durMinutes}:${durSeconds}`;

                  updatePayInData = {
                    status: "DUPLICATE",
                    is_notified: true,
                    utr: getBankResponseByUtr?.utr,
                    approved_at: new Date(),
                    is_url_expires: true,
                    payin_commission: payinCommission,
                    user_submitted_image: null,
                    duration: duration
                  };

                  // maybe need to uncomment this

                  // const updatePayInDataRes = await payInRepo.updatePayInData(
                  //   getPayInData?.id,
                  //   updatePayInData
                  // );
                  await botResponseRepo.updateBotResponseByUtr(
                    getBankResponseByUtr?.id,
                    getBankResponseByUtr?.utr
                  );

                  let existingPayinData;
                  existingPayinData = await payInRepo.getPayinDataByUsrSubmittedUtr(getBankResponseByUtr?.utr);
                  if (existingPayinData.length === 0) {
                    existingPayinData = await payInRepo.getPayinDataByUtr(getBankResponseByUtr?.utr);
                  }
                  const response = await sendAlreadyConfirmedMessageTelegramBot(
                    message?.chat?.id,
                    getBankResponseByUtr?.utr,
                    TELEGRAM_BOT_TOKEN,
                    message?.message_id,
                    existingPayinData,
                    fromUI
                  );
                  if (fromUI) {
                    return res.status(200).json({ message: response });
                  }

                  // Notify url--->
                  const notifyData = {
                    status: "DUPLICATE",
                    merchantOrderId: getPayInData?.merchant_order_id,
                    payinId: getPayInData?.id,
                    amount: getPayInData?.confirmed,
                    req_amount: getPayInData?.amount,
                    utr_id: getPayInData?.utr
                  }
                  try {
                    //When we get the notify url we will add it.
                    logger.info('Sending notification to merchant', { notify_url: getPayInData.notify_url, notify_data: notifyData });

                    const notifyMerchant = await axios.post(getPayInData.notify_url, notifyData);
                    logger.info('Sending notification to merchant', {
                      status: notifyMerchant.status,
                      data: notifyMerchant.data,
                    })
                  } catch (error) {
                    console.error("Error sending notification:", error);
                  }

                  return
                } else {
                  if (getPayInData?.user_submitted_utr) {
                    if (getPayInData?.user_submitted_utr === getBankResponseByUtr.utr) {
                      const payinCommission = calculateCommission(
                        getBankResponseByUtr?.amount,
                        getPayInData.Merchant?.payin_commission
                      );
                      const durMs = new Date() - getPayInData.createdAt;
                      const durSeconds = Math.floor((durMs / 1000) % 60).toString().padStart(2, '0');
                      const durMinutes = Math.floor((durSeconds / 60) % 60).toString().padStart(2, '0');
                      const durHours = Math.floor((durMinutes / 60) % 24).toString().padStart(2, '0');
                      const duration = `${durHours}:${durMinutes}:${durSeconds}`;
    
                      updatePayInData = {
                        confirmed: getBankResponseByUtr?.amount,
                        status: "SUCCESS",
                        is_notified: true,
                        utr: getBankResponseByUtr.utr,
                        approved_at: new Date(),
                        is_url_expires: true,
                        payin_commission: payinCommission,
                        user_submitted_image: null,
                        duration: duration
                      };
                      const updatePayInDataRes = await payInRepo.updatePayInData(
                        getPayInData?.id,
                        updatePayInData
                      );
    
                      await botResponseRepo.updateBotResponseByUtr(
                        getBankResponseByUtr?.id,
                        getBankResponseByUtr?.utr
                      );
    
                      const response = await sendSuccessMessageTelegram(
                        message?.chat?.id,
                        merchantOrderId,
                        TELEGRAM_BOT_TOKEN,
                        message?.message_id,
                        fromUI
                      );
    
                      // ----> Notify url
                      try {
    
                        const notifyData = {
                          status: "SUCCESS",
                          merchantOrderId: updatePayInDataRes?.merchant_order_id,
                          payinId: updatePayInDataRes?.id,
                          amount: updatePayInDataRes?.confirmed,
                          req_amount: updatePayInDataRes?.amount,
                          utr_id: updatePayInDataRes?.utr
                        }
                        //When we get the notify url we will add it.
                        logger.info('Sending notification to merchant', { notify_url: updatePayInDataRes.notify_url, notify_data: notifyData });
                        const notifyMerchant = await axios.post(updatePayInDataRes.notify_url, notifyData);
                        logger.info('Sending notification to merchant', {
                          status: notifyMerchant.status,
                          data: notifyMerchant.data,
                        })
                      } catch (error) {
                        console.error("Error sending notification to merchant:", error);
                      }
                      if (fromUI) {
                        return res.status(200).json({ message: response });
                      }
                      else {
                        return;
                      }
                    }
                    else {
                      const response = await sendErrorMessageUtrMismatchTelegramBot(
                        message?.chat?.id,
                        getPayInData?.user_submitted_utr,
                        getBankResponseByUtr?.utr,
                        TELEGRAM_BOT_TOKEN,
                        message?.message_id,
                        fromUI 
                      );

                      if (fromUI) {
                        return res.status(200).json({ message: response });
                      }
                      else {
                        return;
                      }
                    }
                  }
                  else {
                    const payinCommission = calculateCommission(
                      getBankResponseByUtr?.amount,
                      getPayInData.Merchant?.payin_commission
                    );
                    const durMs = new Date() - getPayInData.createdAt;
                    const durSeconds = Math.floor((durMs / 1000) % 60).toString().padStart(2, '0');
                    const durMinutes = Math.floor((durSeconds / 60) % 60).toString().padStart(2, '0');
                    const durHours = Math.floor((durMinutes / 60) % 24).toString().padStart(2, '0');
                    const duration = `${durHours}:${durMinutes}:${durSeconds}`;
  
                    updatePayInData = {
                      confirmed: getBankResponseByUtr?.amount,
                      status: "SUCCESS",
                      is_notified: true,
                      utr: getBankResponseByUtr.utr,
                      approved_at: new Date(),
                      is_url_expires: true,
                      payin_commission: payinCommission,
                      user_submitted_image: null,
                      duration: duration
                    };
                    const updatePayInDataRes = await payInRepo.updatePayInData(
                      getPayInData?.id,
                      updatePayInData
                    );
  
                    await botResponseRepo.updateBotResponseByUtr(
                      getBankResponseByUtr?.id,
                      getBankResponseByUtr?.utr
                    );
  
                    const response = await sendSuccessMessageTelegram(
                      message?.chat?.id,
                      merchantOrderId,
                      TELEGRAM_BOT_TOKEN,
                      message?.message_id,
                      fromUI
                    );
  
                    // ----> Notify url
                    try {
  
                      const notifyData = {
                        status: "SUCCESS",
                        merchantOrderId: updatePayInDataRes?.merchant_order_id,
                        payinId: updatePayInDataRes?.id,
                        amount: updatePayInDataRes?.confirmed,
                        req_amount: updatePayInDataRes?.amount,
                        utr_id: updatePayInDataRes?.utr
                      }
                      //When we get the notify url we will add it.
                      logger.info('Sending notification to merchant', { notify_url: updatePayInDataRes.notify_url, notify_data: notifyData });
                      const notifyMerchant = await axios.post(updatePayInDataRes.notify_url, notifyData);
                      logger.info('Sending notification to merchant', {
                        status: notifyMerchant.status,
                        data: notifyMerchant.data,
                      })
                    } catch (error) {
                      console.error("Error sending notification to merchant:", error);
                    }
                    if (fromUI) {
                      return res.status(200).json({ message: response });
                    }
                    else {
                      return;
                    }
                  }
                }
              }

              if (
                parseFloat(getPayInData?.amount) !== parseFloat(getBankResponseByUtr?.amount)
              ) {
                let isUsrSubmittedUtrUsed
                isUsrSubmittedUtrUsed =
                  await payInRepo?.getPayinDataByUsrSubmittedUtr(utr);
                if (isUsrSubmittedUtrUsed.length === 0) {
                  isUsrSubmittedUtrUsed =
                    await payInRepo?.getPayinDataByUtr(utr);
                }

                if (isUsrSubmittedUtrUsed.length > 0) {

                  let existingPayinData;
                  existingPayinData = await payInRepo.getPayinDataByUsrSubmittedUtr(getBankResponseByUtr?.utr);
                  if (existingPayinData.length === 0) {
                    existingPayinData = await payInRepo.getPayinDataByUtr(getBankResponseByUtr?.utr);
                  }
                  const response = await sendAlreadyConfirmedMessageTelegramBot(
                    message?.chat?.id,
                    getBankResponseByUtr?.utr,
                    TELEGRAM_BOT_TOKEN,
                    message?.message_id,
                    existingPayinData,
                    fromUI
                  );
                  logger.error("Utr is already confirmed");
                  if (!fromUI) {
                    return;
                  }
                  else {
                    return res.status(200).json({ message: response });
                  }
                } else {
                  if (getPayInData?.user_submitted_utr) {
                    if (getPayInData?.user_submitted_utr === getBankResponseByUtr.utr) {
                      const payinCommission = calculateCommission(
                        getBankResponseByUtr?.amount,
                        getPayInData.Merchant?.payin_commission
                      );
  
                      const durMs = new Date() - getPayInData?.createdAt;
                      const durSeconds = Math.floor((durMs / 1000) % 60).toString().padStart(2, '0');
                      const durMinutes = Math.floor((durSeconds / 60) % 60).toString().padStart(2, '0');
                      const durHours = Math.floor((durMinutes / 60) % 24).toString().padStart(2, '0');
                      const duration = `${durHours}:${durMinutes}:${durSeconds}`;
  
                      updatePayInData = {
                        confirmed: getBankResponseByUtr?.amount,
                        status: "DISPUTE",
                        is_notified: true,
                        utr: getBankResponseByUtr?.utr,
                        approved_at: new Date(),
                        is_url_expires: true,
                        payin_commission: payinCommission,
                        user_submitted_image: null,
                        duration: duration
                      };
                      const updatePayInDataRes = await payInRepo.updatePayInData(
                        getPayInData?.id,
                        updatePayInData
                      );
                      await botResponseRepo.updateBotResponseByUtr(
                        getBankResponseByUtr?.id,
                        getBankResponseByUtr?.utr
                      );
  
                      const response = await sendAmountDisputeMessageTelegramBot(
                        message?.chat?.id,
                        getBankResponseByUtr?.amount,
                        getPayInData?.amount,
                        TELEGRAM_BOT_TOKEN,
                        message?.message_id,
                        fromUI
                      );
  
                      // Notify url--->
                      const notifyData = {
                        status: "DISPUTE",
                        merchantOrderId: updatePayInDataRes?.merchant_order_id,
                        payinId: updatePayInDataRes?.id,
                        amount: updatePayInDataRes?.confirmed,
                        req_amount: updatePayInDataRes?.amount,
                        utr_id: updatePayInDataRes?.utr
                      }
                      try {
                        //When we get the notify url we will add it.
                        logger.info('Sending notification to merchant', { notify_url: updatePayInDataRes.notify_url, notify_data: notifyData });
  
                        const notifyMerchant = await axios.post(updatePayInDataRes.notify_url, notifyData);
                        logger.info('Sending notification to merchant', {
                          status: notifyMerchant.status,
                          data: notifyMerchant.data,
                        })
                      } catch (error) {
                        console.error("Error sending notification:", error);
                      }
  
                      if (fromUI) {
                        return res.status(200).json({ message: response });
                      }
                      else {
                        return;
                      }
                    }
                    else {
                      const response = await sendErrorMessageUtrMismatchTelegramBot(
                        message?.chat?.id,
                        getPayInData?.user_submitted_utr,
                        getBankResponseByUtr?.utr,
                        TELEGRAM_BOT_TOKEN,
                        message?.message_id,
                        fromUI 
                      );

                      if (fromUI) {
                        return res.status(200).json({ message: response });
                      }
                      else {
                        return;
                      }
                    }
                  }
                  else {
                    const payinCommission = calculateCommission(
                      getBankResponseByUtr?.amount,
                      getPayInData.Merchant?.payin_commission
                    );

                    const durMs = new Date() - getPayInData?.createdAt;
                    const durSeconds = Math.floor((durMs / 1000) % 60).toString().padStart(2, '0');
                    const durMinutes = Math.floor((durSeconds / 60) % 60).toString().padStart(2, '0');
                    const durHours = Math.floor((durMinutes / 60) % 24).toString().padStart(2, '0');
                    const duration = `${durHours}:${durMinutes}:${durSeconds}`;

                    updatePayInData = {
                      confirmed: getBankResponseByUtr?.amount,
                      status: "DISPUTE",
                      is_notified: true,
                      utr: getBankResponseByUtr?.utr,
                      approved_at: new Date(),
                      is_url_expires: true,
                      payin_commission: payinCommission,
                      user_submitted_image: null,
                      duration: duration
                    };
                    const updatePayInDataRes = await payInRepo.updatePayInData(
                      getPayInData?.id,
                      updatePayInData
                    );
                    await botResponseRepo.updateBotResponseByUtr(
                      getBankResponseByUtr?.id,
                      getBankResponseByUtr?.utr
                    );

                    const response = await sendAmountDisputeMessageTelegramBot(
                      message?.chat?.id,
                      getBankResponseByUtr?.amount,
                      getPayInData?.amount,
                      TELEGRAM_BOT_TOKEN,
                      message?.message_id,
                      fromUI
                    );

                    // Notify url--->
                    const notifyData = {
                      status: "DISPUTE",
                      merchantOrderId: updatePayInDataRes?.merchant_order_id,
                      payinId: updatePayInDataRes?.id,
                      amount: updatePayInDataRes?.confirmed,
                      req_amount: updatePayInDataRes?.amount,
                      utr_id: updatePayInDataRes?.utr
                    }
                    try {
                      //When we get the notify url we will add it.
                      logger.info('Sending notification to merchant', { notify_url: updatePayInDataRes.notify_url, notify_data: notifyData });

                      const notifyMerchant = await axios.post(updatePayInDataRes.notify_url, notifyData);
                      logger.info('Sending notification to merchant', {
                        status: notifyMerchant.status,
                        data: notifyMerchant.data,
                      })
                    } catch (error) {
                      console.error("Error sending notification:", error);
                    }

                    if (fromUI) {
                      return res.status(200).json({ message: response });
                    }
                    else {
                      return;
                    }
                  }
                }
              }
            }

          } else {
            logger.error("Merchant orderId or UTR is missing");
            return
          }
        }
      } else {
        logger.error("Message is missing");
        return
      }
    } catch (error) {
      console.log(error);
    }
  }

  async expireOneTimeUrl(req, res, next) {
    try {
      checkValidation(req)
      const { id } = req.params;
      const expirePayInUrlRes = await payInServices.oneTimeExpire(id);
      return DefaultResponse(res, 200, "URL is expired!");
    } catch (error) {
      next(error);
    }
  }
  // For test modal pop up
  async updatePaymentStatus(req, res, next) {
    try {
      checkValidation(req);
      const { payInId } = req.params;
      const updatePayInData = {
        status: req.body.status,
      };
      const updatePayInRes = await payInRepo.updatePayInData(
        payInId,
        updatePayInData
      );
      const notifyData = {
        status: req.body.status === "TEST_SUCCESS" ? "success" : req.body.status === "TEST_DROPPED" ? "Dropped" : "",
        merchantOrderId: updatePayInRes?.merchant_order_id,
        payinId: updatePayInRes?.id,
        amount: updatePayInRes?.amount,
        utr_id: updatePayInRes?.utr || ""
      };
      //Notify the merchant
      try {
        logger.info('Sending notification to merchant', { notify_url: getPayInData.notify_url, notify_data: notifyData });
        const notifyMerchant = await axios.post(updatePayInRes.notify_url, notifyData);
        logger.info('Sending notification to merchant', {
          status: notifyMerchant.status,
          data: notifyMerchant.data,
        })
      } catch (error) {
        console.log("error", error)
      }
      return DefaultResponse(
        res,
        200,
        "Payment status updated successfully",
      );
    } catch (error) {
      next(error);
    }
  }

  async updatePaymentNotificationStatus(req, res, next) {
    try {
      checkValidation(req);
      const { payInId } = req.params;
      const updatePayInData = {
        is_notified: true,
      };
      const updatePayInRes = await payInRepo.updatePayInData(
        payInId,
        updatePayInData
      );
      const notifyData = {
        status: "SUCCESS",
        merchantOrderId: updatePayInRes?.merchant_order_id,
        payinId: updatePayInRes?.id,
        amount: updatePayInRes?.confirmed,
        utr_id: updatePayInRes?.utr || ""
      };
      //Notify the merchant
      try {
        logger.info('Sending notification to merchant', { notify_url: updatePayInRes.notify_url, notify_data: notifyData });
        const notifyMerchant = await axios.post(updatePayInRes.notify_url, notifyData);
        logger.info('Sending notification to merchant', {
          status: notifyMerchant.status,
          data: notifyMerchant.data,
        })
      } catch (error) {
        console.log("error", error)
      }
      return DefaultResponse(
        res,
        200,
        "Payment Notified successfully",
      );
    } catch (error) {
      next(error);
    }
  }

  async updateDepositStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { bank_name } = req.body;

      const payInData = await payInRepo.getPayInDataByMerchantOrderId(id);

      if (!payInData) {
        return DefaultResponse(res, 404, "PayIn data not found");
      }
      if (payInData.status !== "BANK_MISMATCH") {
        return DefaultResponse(res, 400, "Status is not BANK_MISMATCH, no update applied");
      }
      const getBankResponseByUtr = await botResponseRepo.getBotResByUtr(
        payInData?.utr
      );

      const payinCommission = calculateCommission(
        getBankResponseByUtr?.amount,
        payInData?.Merchant?.payin_commission
      );

      const durMs = new Date() - payInData?.createdAt;
      const durSeconds = Math.floor((durMs / 1000) % 60).toString().padStart(2, '0');
      const durMinutes = Math.floor((durSeconds / 60) % 60).toString().padStart(2, '0');
      const durHours = Math.floor((durMinutes / 60) % 24).toString().padStart(2, '0');
      const duration = `${durHours}:${durMinutes}:${durSeconds}`;
      const getBank = await bankAccountRepo.getBankNickName(bank_name);

      let getSuccessData
      if (getBankResponseByUtr.is_used) {
        let existingPayinData;
        existingPayinData = await payInRepo.getPayinDataByUtr(getBankResponseByUtr?.utr);
        if (existingPayinData.length === 0) {
          existingPayinData = await payInRepo.getPayinDataByUsrSubmittedUtr(getBankResponseByUtr?.utr);
        }
        if (existingPayinData.length > 1) {
          getSuccessData = existingPayinData.filter(data => data.status === "SUCCESS")
        }
      }
      else {
        getSuccessData = [];
      }

      const updatePayInData = {
        status: getBankResponseByUtr?.bankName != bank_name ? "BANK_MISMATCH" : getSuccessData?.length > 0 ? "DUPLICATE" : parseFloat(payInData?.amount) !== parseFloat(payInData?.confirmed) ? "DISPUTE" : "SUCCESS",
        bank_name: bank_name,
        bank_acc_id: getBank.id,
        duration: duration,
      };

      if (updatePayInData.status === "SUCCESS") {
        updatePayInData.payin_commission = payinCommission;
        updatePayInData.amount = payInData.confirmed;
      }

      const updatePayInRes = await payInRepo.updatePayInData(payInData?.id, updatePayInData);

      await botResponseRepo.updateBotResponseByUtr(
        getBankResponseByUtr?.id,
        getBankResponseByUtr?.utr
      );

      await bankAccountRepo.updateBankAccountBalance(
        getBank?.id,
        parseFloat(payInData.confirmed)
      );

      const notifyData = {
        status: updatePayInRes?.status,
        merchantOrderId: updatePayInRes?.merchant_order_id,
        payinId: updatePayInRes?.id,
        amount: updatePayInRes?.confirmed,
        utr_id: updatePayInRes?.utr || ""
      };

      try {
        logger.info('Sending notification to merchant', { notify_url: updatePayInRes.notify_url, notify_data: notifyData });
        const notifyMerchant = await axios.post(updatePayInRes.notify_url, notifyData);
        logger.info('Sending notification to merchant', {
          status: notifyMerchant.status,
          data: notifyMerchant.data,
        })
      } catch (error) {
        console.log("error", error)
      }

      return DefaultResponse(res, 200, "PayIn data updated successfully");
    } catch (error) {
      next(error);
    }
  }

  async hardResetDeposit(req, res, next) {
    try {
      const { id } = req.params;
      const payInData = await payInRepo.getPayInData(id);
      if (!payInData) {
        throw new CustomError(404, "Payin data does not exist");
      }
      const utr = payInData?.utr ? payInData?.utr : payInData?.user_submitted_utr
      const botRes = await botResponseRepo.getBotResByUtr(utr);

      const updatePayInData = {
        status: "ASSIGNED",
        confirmed: null,
        payin_commission: null,
        utr: null,
        user_submitted_utr: null,
        duration: null,
      };

      if (botRes) {
        let getallPayinDataByUtr
        getallPayinDataByUtr = await payInRepo.getPayinDataByUtr(utr);
        if (getallPayinDataByUtr.length === 0) {
          getallPayinDataByUtr = await payInRepo.getPayinDataByUsrSubmittedUtr(utr);
        }
        const hasSuccess = getallPayinDataByUtr.some((item) => item.status === 'SUCCESS');

        if (!hasSuccess) {
          await botResponseRepo?.updateBotResponseToUnusedUtr(botRes?.id);
        }
      }

      const updatePayInRes = await payInRepo.updatePayInData(payInData?.id, updatePayInData);

      return DefaultResponse(res, 200, "Transaction Reset successfully", updatePayInRes);
    } catch (error) {
      next(error);
    }
  }

  async resetDeposit(req, res, next) {
    try {
      const { merchant_order_id } = req.body;

      const payInData = await payInRepo.getPayInDataByMerchantOrderId(merchant_order_id);
      await sendResetEntryTelegramMessage(
        config?.telegramEntryResetChatId,
        payInData,
        config?.telegramBotToken,
      );
      if (payInData?.status !== "SUCCESS" && payInData?.status !== "FAILED") {
        const utr = payInData?.utr ? payInData?.utr : payInData?.user_submitted_utr
        const botRes = await botResponseRepo.getBotResByUtr(utr);

        const updatePayInData = {
          status: "ASSIGNED",
          confirmed: null,
          payin_commission: null,
          utr: null,
          user_submitted_utr: null,
          duration: null,
        };
        let getallPayinDataByUtr
        getallPayinDataByUtr = await payInRepo.getPayinDataByUtr(utr);
        if (getallPayinDataByUtr.length === 0) {
          getallPayinDataByUtr = await payInRepo.getPayinDataByUsrSubmittedUtr(utr);
        }
        const hasSuccess = getallPayinDataByUtr.some((item) => item.status === 'SUCCESS');

        if (!hasSuccess && botRes?.id) {
          await botResponseRepo?.updateBotResponseToUnusedUtr(botRes?.id);
        }

        const updatePayInRes = await payInRepo.updatePayInData(payInData?.id, updatePayInData);

        return DefaultResponse(res, 200, "Transaction Reset successfully", updatePayInRes);
      }
      else {
        return DefaultResponse(res, 400, "Transaction status is SUCCESS or FAILED, no update applied");
      }
    } catch (error) {
      next(error);
    }
  }
}

export default new PayInController();
