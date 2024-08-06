import { DefaultResponse } from '../helper/customResponse.js';
import { calculateCommission } from '../helper/utils.js';
import { checkValidation } from '../helper/validationHelper.js';
import { detectText } from '../middlewares/OCRMidleware.js';
import { CustomError } from '../middlewares/errorHandler.js';
import bankAccountRepo from '../repository/bankAccountRepo.js';
import botResponseRepo from '../repository/botResponseRepo.js';
import merchantRepo from '../repository/merchantRepo.js';
import payInRepo from '../repository/payInRepo.js';
import payInServices from '../services/payInServices.js';
import { v4 as uuidv4 } from "uuid";
import fs from "fs"


class PayInController {
  // To Generate Url
  async generatePayInUrl(req, res, next) {
    try {
      let payInData;

      const { code, user_id, merchant_order_id, ot } = req.query;
      // If query parameters are provided, use them
      const getMerchantApiKeyByCode = await merchantRepo.getMerchantByCode(code);

      if (!getMerchantApiKeyByCode) {
        throw new CustomError(404, "Merchant does not exist");
      }

      const bankAccountLinkRes = await bankAccountRepo.getMerchantBankById(getMerchantApiKeyByCode?.id);
      if (!bankAccountLinkRes || bankAccountLinkRes.length === 0) {
        throw new CustomError(404, "Bank Account has not been linked with Merchant");
      }


      if (!merchant_order_id && ot) {
        payInData = {
          code: code,
          api_key: getMerchantApiKeyByCode?.api_key,
          merchant_order_id: uuidv4(),
          user_id: user_id
        };
        // Uncomment and use your service to generate PayIn URL
        const generatePayInUrlRes = await payInServices.generatePayInUrl(getMerchantApiKeyByCode, payInData);
        const updateRes = {
          expirationDate: generatePayInUrlRes?.expirationDate,
          payInUrl: `http://localhost:5173/transaction/${generatePayInUrlRes?.id}`, // use env
        };

        if (ot === 'y') {
          return DefaultResponse(res, 200, "Payment is assigned & url is sent successfully", updateRes);
        }
        else {
          res.redirect(302, updateRes?.payInUrl);
        }

      } else {

        payInData = {
          code,
          merchant_order_id,
          user_id
        }

        const generatePayInUrlRes = await payInServices.generatePayInUrl(getMerchantApiKeyByCode, payInData);
        const updateRes = {
          expirationDate: generatePayInUrlRes?.expirationDate,
          payInUrl: `http://localhost:5173/transaction/${generatePayInUrlRes?.id}`, // use env
        };
        return DefaultResponse(res, 200, "Payment is assigned & url is sent successfully", updateRes);
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
        const urlExpired = await payInRepo.expirePayInUrl(payInId);
        throw new CustomError(403, "Session is expired");
      }


      const updatedRes = {
        code: urlValidationRes?.upi_short_code,
        return_url: urlValidationRes?.return_url,
        notify_url: urlValidationRes?.notify_url,
        expiryTime: Number(urlValidationRes?.expirationDate),
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

      const urlValidationRes = await payInRepo.validatePayInUrl(payInId);

      if (!urlValidationRes) {
        throw new CustomError(404, "Payment Url is incorrect");
      }

      if (urlValidationRes?.is_url_expires === true) {
        throw new CustomError(403, "Url is expired");
      }

      if (currentTime > Number(urlValidationRes?.expirationDate)) {
        const urlExpired = await payInRepo.expirePayInUrl(payInId);
        throw new CustomError(403, "Session is expired");
      }

      const getBankDetails = await bankAccountRepo?.getMerchantBankById(
        urlValidationRes?.merchant_id
      );
      if (!getBankDetails || getBankDetails.length === 0) {
        throw new CustomError(404, "Bank is not assigned");
      }

      // Filter for the enabled bank accounts
      const enabledBanks = getBankDetails?.filter(
        (bank) => bank?.bankAccount?.is_enabled
      );

      if (enabledBanks.length === 0) {
        throw new CustomError(404, "No enabled bank account found");
      }

      // Randomly select one enabled bank account
      const randomIndex = Math.floor(Math.random() * enabledBanks.length);
      const selectedBankDetails = enabledBanks[randomIndex];

      const assignedBankToPayInUrlRes =
        await payInServices.assignedBankToPayInUrl(
          payInId,
          selectedBankDetails,
          parseFloat(amount)
        );

      return DefaultResponse(
        res,
        201,
        "Bank account is assigned",
        assignedBankToPayInUrlRes
      );
    } catch (error) {
      next(error);
    }
  }

  // To Expire Url
  async expirePayInUrl(req, res, next) {
    try {
      checkValidation(req);
      const { payInId } = req.params;

      const expirePayinUrl = await payInRepo.expirePayInUrl(payInId)


      return DefaultResponse(
        res,
        200,
        "Payment Url is expires",
      );

    } catch (error) {
      next(error)
    }
  }

  // To Check Payment Status using code. (telegram)
  async checkPaymentStatus(req, res, next) {
    try {
      checkValidation(req);
      const { payInId } = req.params;
      const getPayInData = await payInRepo.getPayInData(payInId);
      if (!getPayInData) {
        throw new CustomError(404, "Payment does not exist");
      }

      const getBotDataRes = await botResponseRepo.getBotData(
        getPayInData?.upi_short_code
      );

      if (getBotDataRes) {
        if (getBotDataRes.is_used === false) {
          const updateBotIsUsedRes = await botResponseRepo.updateBotResponse(getBotDataRes?.amount_code);

          const updateMerchantDataRes = await merchantRepo.updateMerchant(getPayInData?.merchant_id, parseFloat(getBotDataRes?.amount));
          const updateBankAccRes = await bankAccountRepo.updateBankAccountBalance(getPayInData?.bank_acc_id, parseFloat(getBotDataRes?.amount));

          const payinCommission = await calculateCommission(getBotDataRes?.amount, updateMerchantDataRes?.payin_commission);

          if (parseFloat(getBotDataRes?.amount) === parseFloat(getPayInData?.amount)) {
            const updatePayInData = {
              confirmed: getBotDataRes?.amount,
              status: "SUCCESS",
              is_notified: true,
              utr: getBotDataRes?.utr,
              approved_at: new Date(),
              is_url_expires: true,
              payin_commission: payinCommission
            };

            const updatePayInRes = await payInRepo.updatePayInData(
              payInId,
              updatePayInData
            );

            // to notify the Merchant
            const notifyData = {
              status: "success",
              merchantOrderId: updatePayInRes?.merchant_order_id,
              payinId: updatePayInRes?.id,
              amount: updatePayInRes?.confirmed,
            };
            try {
              //when we get the correct notify url;
              // const notifyMerchant = await axios.post(checkPayInUtr[0]?.notify_url, notifyData)
            } catch (error) { }

            const response = {
              status: "Success",
              amount: getBotDataRes?.amount,
              utr: getBotDataRes?.utr,
              transactionId: getPayInData?.merchant_order_id,
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
              is_notified: true,
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
              utr: getBotDataRes?.utr,
              transactionId: getPayInData?.merchant_order_id,
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
          return DefaultResponse(
            res,
            200,
            "Payment is added for this transaction"
          );
        }
      } else {
        const elseResponse = {
          status: "Pending",
          amount: 0,
          payInId: payInId,
          transactionId: getPayInData?.merchant_order_id,
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
      const { usrSubmittedUtr, code, amount, isFront, filePath } = req.body;

      const getPayInData = await payInRepo.getPayInData(payInId);
      if (!getPayInData) {
        throw new CustomError(404, "Payment does not exist");
      }

      const urlValidationRes = await payInRepo.validatePayInUrl(payInId);

      if (isFront !== true) {
        if (urlValidationRes?.is_url_expires === true) {
          throw new CustomError(403, 'Url is expired');
        }
      }

      if (filePath) {
        fs.unlink(`public/${filePath}`, (err) => {
          if (err) console.error('Error deleting the file:', err);
        });
      }

      const matchDataFromBotRes = await botResponseRepo.getBotResByUtr(
        usrSubmittedUtr
      );
      let payInData;
      let responseMessage;

      if (!matchDataFromBotRes) {
        payInData = {
          amount,
          status: "PENDING",
          user_submitted_utr: usrSubmittedUtr,
          is_url_expires: true,
          user_submitted_image: null
        };
        responseMessage = "Payment Not Found";
      } else if (matchDataFromBotRes.is_used === true) {
        payInData = {
          amount,
          status: "DUPLICATE",
          is_notified: true,
          user_submitted_utr: usrSubmittedUtr,
          is_url_expires: true,
          user_submitted_image: null
        };
        responseMessage = "Duplicate Payment Found";
      } else {
        const updateBotRes = await botResponseRepo.updateBotResponseByUtr(matchDataFromBotRes?.id, usrSubmittedUtr);

        const updateMerchantRes = await merchantRepo.updateMerchant(getPayInData?.merchant_id, parseFloat(matchDataFromBotRes?.amount));

        const updateBankRes = await bankAccountRepo.updateBankAccountBalance(getPayInData?.bank_acc_id, parseFloat(matchDataFromBotRes?.amount));


        const payinCommission = await calculateCommission(matchDataFromBotRes?.amount, updateMerchantRes?.payin_commission);

        if (parseFloat(amount) === parseFloat(matchDataFromBotRes?.amount)) {
          payInData = {
            confirmed: matchDataFromBotRes?.amount,
            status: "SUCCESS",
            is_notified: true,
            user_submitted_utr: usrSubmittedUtr,
            utr: matchDataFromBotRes.utr,
            approved_at: new Date(),
            is_url_expires: true,
            payin_commission: payinCommission,
            user_submitted_image: null
          };
          responseMessage = "Payment Done successfully";
        } else {
          payInData = {
            confirmed: matchDataFromBotRes?.amount,
            status: "DISPUTE",
            is_notified: true,
            user_submitted_utr: usrSubmittedUtr,
            utr: matchDataFromBotRes.utr,
            approved_at: new Date(),
            is_url_expires: true,
            user_submitted_image: null
          };
          responseMessage = "Dispute in Payment";
        }
      }

      const updatePayinRes = await payInRepo.updatePayInData(
        payInId,
        payInData
      );

      if (updatePayinRes.status === "SUCCESS") {
        const notifyData = {
          status: "success",
          merchantOrderId: updatePayinRes?.merchant_order_id,
          payinId: payInId,
          amount: updatePayinRes?.confirmed,
        };
        try {
          //When we get the notify url we will add it.
          // const notifyMerchant = await axios.post(getPayInData.notify_url, notifyData);
          // console.log("Notification sent:", notifyMerchant);
        } catch (error) {
          console.error("Error sending notification:", error);
        }
      }

      const response = {
        status:
          payInData.status === "SUCCESS"
            ? "Success"
            : payInData.status,
        amount,
        transactionId: updatePayinRes?.merchant_order_id,
        return_url: updatePayinRes?.return_url,
      };

      if (payInData.status === "SUCCESS") {
        response.utr = updatePayinRes?.utr;
      }

      return DefaultResponse(res, 200, responseMessage, response);
    } catch (error) {
      console.error("Error in payInProcess:", error);
      next(error);
    }
  }

  // To Get pay-in data.
  async getAllPayInData(req, res, next) {
    try {

      const { sno, upiShortCode, confirmed, amount, merchantOrderId, merchantCode, userId, userSubmittedUtr, utr, payInId, dur, status, bank, filterToday } = req.query;
      const page = parseInt(req.query.page) || 1;
      const pageSize = parseInt(req.query.pageSize) || 20;
      const skip = (page - 1) * pageSize;
      const take = pageSize;

      const filterTodayBool = filterToday === "false"; // to check the today entry

      const payInDataRes = await payInServices.getAllPayInData(skip, take, parseInt(sno), upiShortCode, confirmed, amount, merchantOrderId, merchantCode, userId, userSubmittedUtr, utr, payInId, dur, status, bank, filterTodayBool);

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
      const filePath = req.file.path;
      const { payInId } = req.params;
      const { amount } = req.query
      const usrSubmittedUtr = await detectText(filePath);
      if (usrSubmittedUtr !== null) {
        if (usrSubmittedUtr.length > 0) {
          console.log('UTR Numbers:', usrSubmittedUtr);
          const usrSubmittedUtrData = usrSubmittedUtr[0]
          // Delete the image file
          fs.unlink(filePath, (err) => {
            if (err) console.error('Error deleting the file:', err);
          });

          const getPayInData = await payInRepo.getPayInData(payInId);
          if (!getPayInData) {
            throw new CustomError(404, "Payment does not exist");
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

          if (!matchDataFromBotRes) {
            payInData = {
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
            };
            responseMessage = "Duplicate Payment Found";
          } else {
            await botResponseRepo.updateBotResponseByUtr(
              matchDataFromBotRes?.id,
              usrSubmittedUtrData
            );
            await merchantRepo.updateMerchant(
              getPayInData?.merchant_id,
              parseFloat(matchDataFromBotRes?.amount)
            );
            await bankAccountRepo.updateBankAccountBalance(
              getPayInData?.bank_acc_id,
              parseFloat(matchDataFromBotRes?.amount)
            );

            if (
              parseFloat(amount) === parseFloat(matchDataFromBotRes?.amount)
            ) {
              payInData = {
                confirmed: matchDataFromBotRes?.amount,
                status: "SUCCESS",
                is_notified: true,
                user_submitted_utr: usrSubmittedUtrData,
                utr: matchDataFromBotRes.utr,
                approved_at: new Date(),
                is_url_expires: true,
              };
              responseMessage = "Payment Done successfully";
            } else {
              payInData = {
                confirmed: matchDataFromBotRes?.amount,
                status: "DISPUTE",
                is_notified: true,
                user_submitted_utr: usrSubmittedUtrData,
                utr: matchDataFromBotRes.utr,
                approved_at: new Date(),
                is_url_expires: true,
              };
              responseMessage = "Dispute in Payment";
            }
          }
          const updatePayinRes = await payInRepo.updatePayInData(
            payInId,
            payInData
          );

          if (updatePayinRes.status === "SUCCESS") {
            const notifyData = {
              status: "success",
              merchantOrderId: updatePayinRes?.merchant_order_id,
              payinId: payInId,
              amount: updatePayinRes?.confirmed,
            };
            try {
              //When we get the notify url we will add it.
              // const notifyMerchant = await axios.post(getPayInData.notify_url, notifyData);
              // console.log("Notification sent:", notifyMerchant);
            } catch (error) {
              console.error("Error sending notification:", error);
            }
          }

          const response = {
            status:
              payInData.status === "SUCCESS"
                ? "Success"
                : payInData.status || "Not Found",
            amount,
            transactionId: updatePayinRes?.merchant_order_id,
            return_url: updatePayinRes?.return_url,
          };

          if (payInData.status === "SUCCESS") {
            response.utr = updatePayinRes?.utr;
          }

          return DefaultResponse(res, 200, responseMessage, response);
        }
      } else {
        // No UTR found, send image URL to the controller
        const imageUrl = `Images/${req.file.filename}`;
        console.log("Image URL:", imageUrl);

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
          transactionId: updatePayinRes?.merchant_order_id,
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
      const { merchantCode } = req.query;

      const payInDataRes = await payInServices.getAllPayInDataByMerchant(
        merchantCode.split(",")
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
  //new get All pay In data.
  async getAllPayInDataWithRange(req, res, next) {
    try {
      checkValidation(req);
      const { merchantCode, status, startDate, endDate } = req.query;

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
    } catch (error) {
      next(error);
    }
  }


}

export default new PayInController();
