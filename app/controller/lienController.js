
import { DefaultResponse } from "../helper/customResponse.js";
import { checkValidation } from "../helper/validationHelper.js";
import lienRepo from "../repository/lienRepo.js";
import merchantRepo from "../repository/merchantRepo.js";
import payInRepo from "../repository/payInRepo.js";

class LienController {
    async createLien(req, res, next) {
        try {
            checkValidation(req);
            const merchant = await merchantRepo.getMerchantByCode(req.body.code);
            if (!merchant) {
                return DefaultResponse(
                    res,
                    404,
                    "Merchant does not exist",
                );
            }
            const getPayInData = await payInRepo.getPayInDataByMerchantOrderId(
                req.body.merchant_order_id
            );
            if (!getPayInData) {
                return DefaultResponse(
                    res,
                    404,
                    "Merchant order id does not exist",
                );
            }
            else if (getPayInData.merchant_id !== merchant.code) {
                return DefaultResponse(
                    res,
                    404,
                    "Please enter valid merchant order id",
                );
            }
            else if (getPayInData.user_id !== req.body.user_id) {
                return DefaultResponse(
                    res,
                    404,
                    "Please enter valid user id",
                );
            }
            // else if (parseFloat(getPayInData.amount) !== parseFloat(req.body.amount)) {
            //     return DefaultResponse(
            //         res,
            //         404,
            //         "Please enter valid amount",
            //     );
            // }

            delete req.body.code;
            let lienData = {
                merchant_id: merchant.id,
                amount: req.body.amount,
                merchant_order_id: req.body.merchant_order_id,
                when: req.body.when,
                user_id: req.body.user_id
            }

            const lien = await lienRepo.createLien(lienData);

            return DefaultResponse(
                res,
                201,
                "Lien created successful",
                lien
            );
        } catch (error) {
            next(error);
        }
    }

    async getLienResponse(req, res, next) {
        try {
            const {
                sno,
                amount,
                merchant_order_id,
                merchantCode,
                user_id,
            } = req.query;
            const page = parseInt(req.query.page) || 1;
            const pageSize = parseInt(req.query.pageSize) || 20;
            const skip = (page - 1) * pageSize;
            const take = pageSize;

            const lien = await lienRepo.getLien(
                skip,
                take,
                parseInt(sno),
                amount,
                merchant_order_id,
                merchantCode,
                user_id
            );

            return DefaultResponse(
                res,
                200,
                "Lien fetched successful",
                lien
            );
        } catch (error) {
            next(error);
        }
    }
}

export default new LienController();
