import { DefaultResponse } from "../helper/customResponse.js";
import { checkValidation } from "../helper/validationHelper.js";
import { CustomError } from "../middlewares/errorHandler.js";
import merchantRepo from "../repository/merchantRepo.js";
import userRepo from "../repository/userRepo.js";
import { v4 as uuidv4 } from 'uuid';

class MerchantController {
    async createMerchant(req, res, next) {
        try {
            checkValidation(req)
            const data = req.body;
            const api_key = uuidv4()
            console.log("🚀 ~ MerchantController ~ createMerchant ~ api_key:", api_key)
            const secret_key = uuidv4()
            console.log("🚀 ~ MerchantController ~ createMerchant ~ secret_key:", secret_key)

      const isMerchantExist = await merchantRepo.getMerchantByCode(data?.code);

      if (isMerchantExist) {
        throw new CustomError(409, "Merchant with this code already exist");
      }

      const merchantRes = await merchantRepo.createMerchant(data);

            const updateData = {
                ...data,
                api_key,
                secret_key
            }
            const merchantRes = await merchantRepo.createMerchant(updateData)

            return DefaultResponse(
                res,
                201,
                "Merchant is created successfully",

            );
        } catch (error) {
            next(error)
        }
    }


  async getAllMerchants(req, res, next) {
    try {
      checkValidation(req);
      const { id: userId } = req.user;

      const page = parseInt(req.query.page) || 1;
      const pageSize = parseInt(req.query.pageSize) || 15;

      // const fullName = req.query.name;

      // const userName = req.query.userName;

      // const role = req.query.role;

      const skip = (page - 1) * pageSize;
      const take = pageSize;

      await userRepo.validateUserId(userId);

      const merchants = await merchantRepo.getAllMerchants(skip, take);

      return DefaultResponse(
        res,
        201,
        "Merchants fetched successfully",
        merchants
      );
    } catch (error) {
      next(error);
    }
  }
}



}

export default new MerchantController()