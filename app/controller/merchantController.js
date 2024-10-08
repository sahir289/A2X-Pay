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
      const data = req.body;
      const api_key = uuidv4();
      const secret_key = uuidv4();
      const isMerchantExist = await merchantRepo.getMerchantByCode(data?.code);

      if (isMerchantExist) {
        throw new CustomError(409, "Merchant with this code already exist");
      }

      const updateData = {
        ...data,
        api_key,
        secret_key,
      };
      const merchantRes = await merchantRepo.createMerchant(updateData);

      return DefaultResponse(res, 201, "Merchant is created successfully");
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
