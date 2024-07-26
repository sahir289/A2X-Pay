import { DefaultResponse } from '../helper/customResponse.js';
import { checkValidation } from '../helper/validationHelper.js';
import { CustomError } from '../middlewares/errorHandler.js';
import bankAccountRepo from '../repository/bankAccountRepo.js';
import botResponseRepo from '../repository/botResponseRepo.js';
import payInRepo from '../repository/payInRepo.js';
import payInServices from '../services/payInServices.js';

class PayInController {
    async generatePayInUrl(req, res, next) {
        try {

            checkValidation(req)

            const payInData = req.body

            const { code, api_key } = payInData;

            const getMerchantRes = await payInRepo.getMerchantByCodeAndApiKey(code, api_key)
            if (!getMerchantRes) {
                throw new CustomError(404, 'Merchant does not exist')
            }

            const bankAccountLinkRes = await bankAccountRepo.getMerchantBankById(getMerchantRes?.id)
            if (!bankAccountLinkRes) {
                throw new CustomError(404, 'Bank Account has bot been linked with Merchant')
            }

            const generatePayInUrlRes = await payInServices.generatePayInUrl(getMerchantRes, bankAccountLinkRes, payInData)
            const updateRes = {
                expirationDate: generatePayInUrlRes?.expirationDate,
                payInUrl: `http://localhost:5173/transaction/${generatePayInUrlRes?.id}`     // use env
            }

            return DefaultResponse(
                res,
                200,
                "Payment is assigned & url is sent successfully",
                updateRes
            );
        } catch (err) {
            // Handle errors and pass them to the next middleware
            next(err);
        }
    }

    async validatePayInUrl(req, res, next) {
        try {
            const { payInId } = req.params;
            const currentTime = Math.floor(Date.now() / 1000)

            const urlValidationRes = await payInRepo.validatePayInUrl(payInId)

            if (urlValidationRes?.is_url_expires === true) {
                throw new CustomError(403, 'Url is expired')
            }


            if (currentTime > Number(urlValidationRes?.expirationDate)) {
                const urlExpired = await payInRepo.expirePayInUrl(payInId);
                throw new CustomError(403, 'Session is expired')
            }


            if (!urlValidationRes) {
                throw new CustomError(404, 'Payment Url is incorrect')
            }

            const bankDetails = await bankAccountRepo?.getMerchantBankById(urlValidationRes?.merchant_id)

            const updatedRes = {
                code: urlValidationRes?.upi_short_code,
                return_url: urlValidationRes?.return_url,
                notify_url: urlValidationRes?.notify_url,
                upi_id: bankDetails?.bankAccount?.upi_id,
                ac_name: bankDetails?.bankAccount?.ac_name,
                ac_no: bankDetails?.bankAccount?.ac_no,
                ifsc: bankDetails?.bankAccount?.ifsc,
                bank_name: bankDetails?.bankAccount?.bank_name,
                is_qr: bankDetails?.bankAccount?.is_qr,
                is_bank: bankDetails?.bankAccount?.is_bank,
                expiryTime: Number(urlValidationRes?.expirationDate)
            }

            return DefaultResponse(
                res,
                200,
                "Payment Url is correct",
                updatedRes
            );

        } catch (error) {
            next(error)
        }
    }

    async expirePayInUrl(req, res, next) {
        try {

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

    async checkPaymentStatus(req, res, next) {
        try {
            const { payInId } = req.params;

            const getPayInData = await payInRepo.getPayInData(payInId);

            if (!getPayInData) {
                throw new CustomError(404, 'Payment does not exist')
            }

            const getBotDataRes = await botResponseRepo.getBotData(getPayInData?.upi_short_code);

            if (getBotDataRes) {

                const updateBotIsUsedRes = await botResponseRepo.updateBotResponse(getBotDataRes?.amount_code);

                const updatePayInData = {
                    amount: getBotDataRes?.amount,
                    status: "SUCCESS",
                    is_notified: true,
                    utr: getBotDataRes?.utr,
                    approved_at: new Date(),
                    is_url_expires: true

                };

                const updatePayInRes = await payInRepo.updatePayInData(payInId, updatePayInData);

                const response = {
                    status: "Success",
                    amount: getBotDataRes?.amount,
                    utr: getBotDataRes?.utr,
                    transactionId: getPayInData?.merchant_order_id,
                    return_url: getPayInData?.return_url
                }

                return DefaultResponse(
                    res,
                    200,
                    "Payment status updated successfully",
                    response
                );
            } else {

                const elseResponse = {
                    status: "Pending",
                    amount: 0,
                    payInId: payInId,
                    transactionId: getPayInData?.merchant_order_id
                }

                return DefaultResponse(
                    res,
                    200,
                    "Status Pending",
                    elseResponse
                );
            }
        } catch (error) {
            console.log("🚀 ~ PayInController ~ checkPaymentStatus ~ error:", error)
            next(error);
        }
    }

    async payInProcess(req, res, next) {
        try {

            const { payInId } = req.params;
            const data = req.body;
            const { usrSubmittedUtr, code, amount } = data;
            console.log("🚀 ~ PayInController ~ payInProcess ~ amount:", amount)
            console.log("🚀 ~ PayInController ~ payInProcess ~ usrSubmittedUtr:", usrSubmittedUtr)

            const urlValidationRes = await payInRepo.validatePayInUrl(payInId)

            if (urlValidationRes?.is_url_expires === true) {
                throw new CustomError(403, 'Url is expired')
            }

            const matchDataFromBotRes = await botResponseRepo.getBotResByUtrAndAmount(usrSubmittedUtr, amount);
            console.log("🚀 ~ PayInController ~ payInProcess ~ matchDataFromBotRes:", matchDataFromBotRes)

            let payInData;
            let responseMessage;

            if (!matchDataFromBotRes) {
                payInData = {
                    amount,
                    user_submitted_utr: usrSubmittedUtr,
                    is_url_expires: true
                };

                responseMessage = "Payment Not Found";
            } else if (matchDataFromBotRes.is_used === true) {
                payInData = {
                    amount,
                    status: "DUPLICATE",
                    is_notified: true,
                    user_submitted_utr: usrSubmittedUtr,
                    is_url_expires: true
                };
                const updatePayinRes = await payInRepo.updatePayInData(payInId, payInData);
                console.log("🚀 ~ PayInController ~ payInProcess ~ updatePayinRes:", updatePayinRes)

                responseMessage = "Duplicate Payment Found";
            } else {

                const updateBotByUtrAndAmountRes = await botResponseRepo.updateBotResponseByUtrAndAmount(matchDataFromBotRes?.id, usrSubmittedUtr,amount)
                console.log("🚀 ~ PayInController ~ payInProcess ~ updateBotByUtrAndAmountRes:", updateBotByUtrAndAmountRes)

                payInData = {
                    amount,
                    status: "SUCCESS",
                    is_notified: true,
                    user_submitted_utr:  usrSubmittedUtr,
                    utr: matchDataFromBotRes.utr,
                    approved_at: new Date(),
                    is_url_expires: true
                };

                responseMessage = "Payment Done successfully";
            }

            const updatePayinRes = await payInRepo.updatePayInData(payInId, payInData);

            const response = {
                status: payInData.status || "Not Found",
                amount,
                transactionId: updatePayinRes?.merchant_order_id,
                return_url: updatePayinRes?.return_url
            };
            if (payInData.status === "SUCCESS") {
                response.utr = updatePayinRes?.utr;
            }
            console.log("🚀 ~ PayInController ~ payInProcess ~ response:", response)

            return DefaultResponse(
                res,
                200,
                responseMessage,
                response
            );

        } catch (error) {
            console.log("🚀 ~ PayInController ~ payInProcess ~ error:", error)
            next(error)
        }
    }
}

export default new PayInController()