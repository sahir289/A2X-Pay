import { DefaultResponse } from "../helper/customResponse.js";
import { checkValidation } from "../helper/validationHelper.js";
import { CustomError } from "../middlewares/errorHandler.js";
import merchantRepo from "../repository/merchantRepo.js";
import userRepo from "../repository/userRepo.js";
import { v4 as uuidv4 } from "uuid";

class MerchantController {
  async createMerchant(req, res, next) {
    try {
      checkValidation(req);
      const userRole = req.user
      const data = req.body;
      const api_key = uuidv4();
      const public_api_key = uuidv4();
      const secret_key = uuidv4();

      const isMerchantExist = await merchantRepo.getMerchantByCode(data?.code);

      if (isMerchantExist) {
        throw new CustomError(409, "Merchant with this code already exist");
      }

      const updateData = {
        ...data,
        api_key,
        public_api_key,
        secret_key,
      };

      const merchantRes = await merchantRepo.createMerchant(updateData);


      if (userRole.loggedInUserRole === "MERCHANT_ADMIN") {
        const getMerchantAdmin = await userRepo?.getMerchantAdminByUserId(userRole?.id)
        // Parent finding
        const getMerchantUsingMerchantAdminCode = await merchantRepo?.getMerchantByCode(getMerchantAdmin?.merchantAdminCode)

        // const updateMerchantChildCode = getMerchantUsingMerchantAdminCode.child_code.push(merchantRes?.code);
        let childCodeArray = Array.isArray(getMerchantUsingMerchantAdminCode.child_code)
          ? getMerchantUsingMerchantAdminCode.child_code
          : [];

        // Push the new code
        childCodeArray.push(merchantRes?.code);

        // Update the object with the modified array
        const updateMerchantChildCode = childCodeArray;

        const updateMerchant = await merchantRepo.updateParentMerchantChildCodeById(getMerchantUsingMerchantAdminCode?.id, updateMerchantChildCode)

        //Update user code with new merchant code.
        const updateUserCode = Array.isArray(getMerchantAdmin.code)
          ? getMerchantAdmin.code
          : [];

        // Push the new code
        updateUserCode.push(merchantRes?.code);

        // Update the object with the modified array
        const updateUserCodeWithChildCode = updateUserCode;

        const updateUserCodeData = await userRepo.updateUserCodeWithNewMerchantCode(userRole?.id, updateUserCodeWithChildCode)

      }
      return DefaultResponse(res, 201, "Merchant is created successfully", merchantRes);
    } catch (error) {
      next(error);
    }
  }

  async getMerchants(req, res, next) {
    try {
      checkValidation(req);
      const { id } = req.query;

      const merchant = await merchantRepo.getMerchantById(id);

      return DefaultResponse(
        res,
        200,
        "Merchant fetched successfully",
        merchant
      );
    } catch (error) {
      next(error);
    }
  }

  async getAllMerchants(req, res, next) {
    try {
      checkValidation(req);
      const { id: userId } = req.user;

      const query = req.query;

      await userRepo.validateUserId(userId);

      const merchants = await merchantRepo.getAllMerchants(query);
      return DefaultResponse(
        res,
        200,
        "Merchants fetched successfully",
        merchants
      );
    } catch (error) {
      next(error);
    }
  }

  async getAllMerchantsGrouping(req, res, next) {
    try {
      checkValidation(req);
      const { id: userId } = req.user;

      const query = req.query;

      await userRepo.validateUserId(userId);

      const merchants = await merchantRepo.getAllMerchants(query);
 
      const allChildCodes = new Set(
        merchants?.merchants.flatMap(merchant => merchant.child_code || [])
      );
      const filteredMerchants = merchants?.merchants.filter(
        merchant => !allChildCodes.has(merchant.code)
      );
    
      const remainingMerchants ={
        merchants: filteredMerchants
      }

      return DefaultResponse(
        res,
        200,
        "Merchants fetched successfully",
        remainingMerchants
      );
    } catch (error) {
      next(error);
    }
  }

  async deleteMerchant(req, res, next) {
    try {
      checkValidation(req);
      const body = req.body;

      const merchantRes = await merchantRepo.deleteMerchant(body);

      return DefaultResponse(
        res,
        200,
        "Merchant is deleted successfully",
        merchantRes
      );
    } catch (error) {
      next(error);
    }
  }

  async updateMerchant(req, res, next) {
    try {
      checkValidation(req);
      const data = req.body;

      const merchantRes = await merchantRepo.updateMerchantData(
        data
      );

      return DefaultResponse(
        res,
        200,
        "Merchant is updated successfully",
        merchantRes
      );
    } catch (error) {
      next(error);
    }
  }

  async getAllMerchantsData(req, res, next) {
    try {
      checkValidation(req);
      const { id: userId } = req.user;

      const query = req.query;

      await userRepo.validateUserId(userId);

      const merchants = await merchantRepo.getAllMerchantsData(query);
      return DefaultResponse(
        res,
        200,
        "Merchants fetched successfully",
        merchants
      );
    } catch (error) {
      next(error);
    }
  }
}

export default new MerchantController();
