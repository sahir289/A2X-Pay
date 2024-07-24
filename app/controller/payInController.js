import { DefaultResponse } from '../helper/customResponse.js';
import { checkValidation } from '../helper/validationHelper.js';
import { CustomError } from '../middlewares/errorHandler.js';
import bankAccountRepo from '../repository/bankAccountRepo.js';
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
            const urlValidationRes = await payInRepo.validatePayInUrl(payInId)
            if (!urlValidationRes) {
                throw new CustomError(404, 'Payment Url is incorrect')
            }

            const bankDetails = await bankAccountRepo?.getMerchantBankById(urlValidationRes?.merchant_id)
            console.log("🚀 ~ PayInController ~ validatePayInUrl ~ bankDetails:", bankDetails)

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

}

export default new PayInController()