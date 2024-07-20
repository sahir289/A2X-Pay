import { hashPassword } from "../helper/passwordHelper.js";
import { checkValidation } from "../helper/validationHelper.js";
import { CustomError, customError } from "../middlewares/errorHandler.js";
import { DefaultResponse } from "../helper/customResponse.js"
import userRepo from "../repository/userRepo.js";
import userService from "../services/userService.js";
import merchantRepo from "../repository/merchantRepo.js";

class MerchantController {
    async createMerchant(req, res, next) {
        try {
            checkValidation(req)
            const data = req.body;

            const isMerchantExist = await merchantRepo.getMerchantByCode(data?.code)

            if (isMerchantExist) {
                throw new CustomError(409, 'Merchant with this code already exist')
            }

            const merchantRes = await merchantRepo.createMerchant(data)

            return DefaultResponse(
                res,
                201,
                "Merchant is created successfully",
                // userRes
            );
        } catch (error) {
            next(error)
        }
    }


    async getAllMerchants(req, res, next) {
        try {
            checkValidation(req)
            const { id: userId } = req.user

            const page = parseInt(req.query.page) || 1;
            const pageSize = parseInt(req.query.pageSize) || 15

            // const fullName = req.query.name;

            // const userName = req.query.userName;

            // const role = req.query.role;

            const skip = (page - 1) * pageSize
            const take = pageSize

            await userRepo.validateUserId(userId)

            const merchants = await merchantRepo.getAllMerchants(skip, take)

            return DefaultResponse(
                res,
                201,
                "Merchants fetched successfully",
                merchants
            );
        } catch (error) {
            next(error)
        }
    }
}

export default new MerchantController()