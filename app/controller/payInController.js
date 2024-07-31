import { DefaultResponse } from '../helper/customResponse.js';
import { checkValidation } from '../helper/validationHelper.js';
import { CustomError } from '../middlewares/errorHandler.js';
import bankAccountRepo from '../repository/bankAccountRepo.js';
import botResponseRepo from '../repository/botResponseRepo.js';
import merchantRepo from '../repository/merchantRepo.js';
import payInRepo from '../repository/payInRepo.js';
import payInServices from '../services/payInServices.js';

class PayInController {
    // To Generate Url
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
            if (!bankAccountLinkRes || bankAccountLinkRes.length === 0) {
                throw new CustomError(404, 'Bank Account has bot been linked with Merchant')
            }

            const generatePayInUrlRes = await payInServices.generatePayInUrl(getMerchantRes, payInData)
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

    // To Validate Url
    async validatePayInUrl(req, res, next) {
        try {
            checkValidation(req)

            const { payInId } = req.params;
            const currentTime = Math.floor(Date.now() / 1000)

            const urlValidationRes = await payInRepo.validatePayInUrl(payInId)

            if (!urlValidationRes) {
                throw new CustomError(404, 'Payment Url is incorrect')
            }

            if (urlValidationRes?.is_url_expires === true) {
                throw new CustomError(403, 'Url is expired')
            }

            if (currentTime > Number(urlValidationRes?.expirationDate)) {
                const urlExpired = await payInRepo.expirePayInUrl(payInId);
                throw new CustomError(403, 'Session is expired')
            }

            const bankDetails = await bankAccountRepo?.getMerchantBankById(urlValidationRes?.merchant_id)

            if (!bankDetails || bankDetails.length === 0) {
                throw new CustomError(404, 'Bank is not assigned');
            }

            // Filter for the enabled bank accounts
            const enabledBanks = bankDetails.filter(bank => bank?.bankAccount?.is_enabled);

            if (enabledBanks.length === 0) {
                throw new CustomError(404, 'No enabled bank account found');
            }

            const updatedRes = {
                code: urlValidationRes?.upi_short_code,
                return_url: urlValidationRes?.return_url,
                notify_url: urlValidationRes?.notify_url,
                // upi_id: bankDetails?.bankAccount?.upi_id,
                // ac_name: bankDetails?.bankAccount?.ac_name,
                // ac_no: bankDetails?.bankAccount?.ac_no,
                // ifsc: bankDetails?.bankAccount?.ifsc,
                // bank_name: bankDetails?.bankAccount?.bank_name,
                // is_qr: bankDetails?.bankAccount?.is_qr,
                // is_bank: bankDetails?.bankAccount?.is_bank,
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

    // To Add the bank.
    async assignedBankToPayInUrl(req, res, next) {
        try {
            checkValidation(req)

            const { payInId } = req.params;
            const { amount } = req.body
            const currentTime = Math.floor(Date.now() / 1000)

            const urlValidationRes = await payInRepo.validatePayInUrl(payInId)

            if (!urlValidationRes) {
                throw new CustomError(404, 'Payment Url is incorrect')
            }

            if (urlValidationRes?.is_url_expires === true) {
                throw new CustomError(403, 'Url is expired')
            }


            if (currentTime > Number(urlValidationRes?.expirationDate)) {
                const urlExpired = await payInRepo.expirePayInUrl(payInId);
                throw new CustomError(403, 'Session is expired')
            }

            const getBankDetails = await bankAccountRepo?.getMerchantBankById(urlValidationRes?.merchant_id)
            if (!getBankDetails || getBankDetails.length === 0) {
                throw new CustomError(404, 'Bank is not assigned');
            }

            // Filter for the enabled bank accounts
            const enabledBanks = getBankDetails.filter(bank => bank?.bankAccount?.is_enabled);

            if (enabledBanks.length === 0) {
                throw new CustomError(404, 'No enabled bank account found');
            }

            // Randomly select one enabled bank account
            const randomIndex = Math.floor(Math.random() * enabledBanks.length);
            const selectedBankDetails = enabledBanks[randomIndex];

            const assignedBankToPayInUrlRes = await payInServices.assignedBankToPayInUrl(payInId, selectedBankDetails, parseFloat(amount))

            return DefaultResponse(
                res,
                201,
                "Bank account is assigned",
                assignedBankToPayInUrlRes
            );

        } catch (error) {
            next(error)
        }
    }

    // To Expire Url
    async expirePayInUrl(req, res, next) {
        try {
            checkValidation(req)
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
            checkValidation(req)
            const { payInId } = req.params;
            const getPayInData = await payInRepo.getPayInData(payInId);
            if (!getPayInData) {
                throw new CustomError(404, 'Payment does not exist');
            }

            const getBotDataRes = await botResponseRepo.getBotData(getPayInData?.upi_short_code);

            if (getBotDataRes) {
                if (getBotDataRes.is_used === false) {
                    const updateBotIsUsedRes = await botResponseRepo.updateBotResponse(getBotDataRes?.amount_code);

                    const updateMerchantDataRes = await merchantRepo.updateMerchant(getPayInData?.merchant_id, parseFloat(getBotDataRes?.amount));

                    const updateBankAccRes = await bankAccountRepo.updateBankAccountBalance(getPayInData?.bank_acc_id, parseFloat(getBotDataRes?.amount));
                    
                    if (parseFloat(getBotDataRes?.amount) === parseFloat(getPayInData?.amount)) {
                        const updatePayInData = {
                            confirmed: getBotDataRes?.amount,
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
                        };

                        return DefaultResponse(
                            res,
                            200,
                            "Payment status updated successfully",
                            response
                        );
                    }
                    else {
                        const updatePayInData = {
                            confirmed: getBotDataRes?.amount,
                            status: "DISPUTE",
                            is_notified: true,
                            utr: getBotDataRes?.utr,
                            approved_at: new Date(),
                            is_url_expires: true
                        };

                        const updatePayInRes = await payInRepo.updatePayInData(payInId, updatePayInData);

                        const response = {
                            status: "DISPUTE",
                            amount: getBotDataRes?.amount,
                            utr: getBotDataRes?.utr,
                            transactionId: getPayInData?.merchant_order_id,
                            return_url: getPayInData?.return_url
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
                    transactionId: getPayInData?.merchant_order_id
                };

                return DefaultResponse(
                    res,
                    200,
                    "Status Pending",
                    elseResponse
                );
            }
        } catch (error) {
            next(error);
        }
    }

    // To Handle payment process
    async payInProcess(req, res, next) {
        try {
            checkValidation(req)
            const { payInId } = req.params;
            const data = req.body;
            const { usrSubmittedUtr, code, amount } = data;

            const getPayInData = await payInRepo.getPayInData(payInId);

            if (!getPayInData) {
                throw new CustomError(404, 'Payment does not exist')
            }

            const urlValidationRes = await payInRepo.validatePayInUrl(payInId)

            if (urlValidationRes?.is_url_expires === true) {
                throw new CustomError(403, 'Url is expired')
            }

            const matchDataFromBotRes = await botResponseRepo.getBotResByUtr(usrSubmittedUtr);
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
                responseMessage = "Duplicate Payment Found";
            } else {

               
                const updateBotByUtrAndAmountRes = await botResponseRepo.updateBotResponseByUtr(matchDataFromBotRes?.id, usrSubmittedUtr)

                const updateMerchantDataRes = await merchantRepo.updateMerchant(getPayInData?.merchant_id, parseFloat(matchDataFromBotRes?.amount))
                const updateBankAccRes = await bankAccountRepo.updateBankAccountBalance(getPayInData?.bank_acc_id, parseFloat(matchDataFromBotRes?.amount))


                if (amount === matchDataFromBotRes?.amount){
                    payInData = {
                        confirmed:matchDataFromBotRes?.amount,
                        status: "SUCCESS",
                        is_notified: true,
                        user_submitted_utr: usrSubmittedUtr,
                        utr: matchDataFromBotRes.utr,
                        approved_at: new Date(),
                        is_url_expires: true
                    };
    
                    responseMessage = "Payment Done successfully";
                }else{
                    payInData = {
                        confirmed:matchDataFromBotRes?.amount,
                        status: "DISPUTE",
                        is_notified: true,
                        user_submitted_utr: usrSubmittedUtr,
                        utr: matchDataFromBotRes.utr,
                        approved_at: new Date(),
                        is_url_expires: true
                    };
    
                    responseMessage = "Dispute in Payment";
                }
                
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

    // To Get pay-in data.
    async getAllPayInData(req, res, next) {
        try {

            const { upiShortCode, amount, merchantOrderId, merchantCode, userId, utr, payInId, dur, status, bank, filterToday } = req.query;

            const page = parseInt(req.query.page) || 1;
            const pageSize = parseInt(req.query.pageSize) || 15;
            const skip = (page - 1) * pageSize;
            const take = pageSize;

            const filterTodayBool = filterToday === 'false';  // to check the today entry

            const payInDataRes = await payInServices.getAllPayInData(skip, take, upiShortCode, amount, merchantOrderId, merchantCode, userId, utr, payInId, dur, status, bank, filterTodayBool);

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

export default new PayInController()