import { DefaultResponse } from "../helper/customResponse.js";
import { checkValidation } from "../helper/validationHelper.js";
import bankAccountRepo from "../repository/bankAccountRepo.js";
import merchantRepo from "../repository/merchantRepo.js";
import { logger } from "../utils/logger.js";

class BankAccountController {
  async createBankAccount(req, res, next) {
    try {
      checkValidation(req);
      const data = req.body;

      const bankAccountRes = await bankAccountRepo.createBankAccount(data);

      return DefaultResponse(
        res,
        201,
        "Bank Account is created successfully",
        bankAccountRes
      );
    } catch (error) {
      next(error);
    }
  }

  async addBankToMerchant(req, res, next) {
    try {
      checkValidation(req);
      const { bankAccountId, includeSubMerchant, merchantId } = req.body;

      if (!includeSubMerchant) {
        let allNewMerchantIds = [];
        const merchantData = await merchantRepo.getMerchantById(merchantId);

        if (merchantData) {
          // Start with the current merchant's ID
          allNewMerchantIds = [merchantData.id];

          if (Array.isArray(merchantData.child_code)) {
            // Fetch all merchants for the child codes
            const childMerchants = await Promise.all(
              merchantData.child_code.map((code) => merchantRepo.getMerchantByCode(code))
            );

            // Collect the IDs from the child merchants
            const childMerchantIds = childMerchants
              .filter((data) => data) // Filter out null or undefined responses
              .map((data) => data.id);

            // Combine the IDs
            allNewMerchantIds = [...allNewMerchantIds, ...childMerchantIds];
          }
        }

        const data = { bankAccountId };

        const bankAccountResponses = await Promise.all(
          allNewMerchantIds.map((id) =>
            bankAccountRepo.addBankToMerchant({
              ...data,
              merchantId: id,
            })
          )
        );

        return DefaultResponse(
          res,
          201,
          "Bank is added to merchant successfully",
          bankAccountResponses
        );
      } else {
        const data = {
          bankAccountId,
          merchantId,
        }

        const bankAccountRes = await bankAccountRepo.addBankToMerchant(data);

        return DefaultResponse(
          res,
          201,
          "Bank is added to merchant successfully",
          bankAccountRes
        );
      }
    } catch (error) {
      next(error);
    }
  }

  // to get the merchant bank
  async getMerchantBank(req, res, next) {
    try {
      checkValidation(req);
      const { id } = req.query;
      const bankAccountRes = await bankAccountRepo.getMerchantBankById(id);

      return DefaultResponse(
        res,
        200,
        "Merchant Bank details get successfully",
        bankAccountRes
      );
    } catch (error) {
      next(error);
    }
  }

  // Controller for getting Payin Banks
  async getPayinBank(req, res, next) {
    try {
      checkValidation(req);
      const bankAccountRes = await bankAccountRepo.getPayinBank();

      return DefaultResponse(
        res,
        200,
        "PayIn Bank details get successfully",
        bankAccountRes
      );
    } catch (error) {
      next(error);
    }
  }

  // Controller for getting Payout Banks
  async getPayoutBank(req, res, next) {
    try {
      checkValidation(req);
      const { loggedInUserRole } = req.user

      const { vendor_code } = req.query;

      const bankAccountRes = await bankAccountRepo.getPayoutBank(vendor_code, loggedInUserRole);

      return DefaultResponse(
        res,
        200,
        "Payout Bank details get successfully",
        bankAccountRes
      );
    } catch (error) {
      next(error);
    }
  }

  async getAllBankAccounts(req, res, next) {
    try {
      checkValidation(req);
      const query = req.query;

      const bankAccountRes = await bankAccountRepo.getAllBankAccounts(query);

      return DefaultResponse(
        res,
        200,
        "All bank accounts fetched successfully",
        bankAccountRes
      );
    } catch (error) {
      next(error);
    }
  }

  // async getAllMerchants(req, res, next) {
  //     try {
  //         checkValidation(req)
  //         const { id: userId } = req.user

  //         const page = parseInt(req.query.page) || 1;
  //         const pageSize = parseInt(req.query.pageSize) || 15

  //         // const fullName = req.query.name;

  //         // const userName = req.query.userName;

  //         // const role = req.query.role;

  //         const skip = (page - 1) * pageSize
  //         const take = pageSize

  //         await userRepo.validateUserId(userId)

  //         const merchants = await merchantRepo.getAllMerchants(skip, take)

  //         return DefaultResponse(
  //             res,
  //             201,
  //             "Merchants fetched successfully",
  //             merchants
  //         );
  //     } catch (error) {
  //         next(error)
  //     }
  // }

  async deleteBankFromMerchant(req, res, next) {
    try {
      checkValidation(req);
      const { bankAccountId, includeSubMerchant, merchantId } = req.body;

      if (!includeSubMerchant) {
        let allNewMerchantIds = [];
        const merchantData = await merchantRepo.getMerchantsByIds(merchantId);

        if (Array.isArray(merchantData)) {

          // Filter out merchants with missing or non-array `child_code`
          const validMerchants = merchantData.filter((data) => {
            const hasChildCode = Array.isArray(data.child_code);
            return hasChildCode; // Only keep merchants with a valid `child_code` array
          });

          const validMerchantIds = validMerchants.filter((data) => data).map((data) => data.id);

          const childMerchants = await Promise.all(
            validMerchants.flatMap((data) =>
              data.child_code.map((code) =>
                merchantRepo.getMerchantByCode(code).catch((err) => {
                  logger.info(`Error fetching merchant for code ${code}:`, err);
                  return null; // Handle individual failures gracefully
                })
              )
            )
          );

          // Collect the IDs from the child merchants
          const childMerchantIds = childMerchants
            .filter((data) => data) // Filter out null or undefined responses
            .map((data) => data.id);

          // Combine the IDs
          allNewMerchantIds = [...validMerchantIds, ...childMerchantIds];
        }

        const data = { bankAccountId };

        if (!Array.isArray(allNewMerchantIds) || allNewMerchantIds.length === 0) {
          logger.info("No merchant IDs to process.");
          return;
        }

        try {
          const bankAccountResponses = await Promise.all(
            allNewMerchantIds.map(async (id) => {
              try {
                return await bankAccountRepo.deleteBankFromMerchant({
                  ...data,
                  merchantId: id,
                });
              } catch (error) {
                logger.info(`Failed to delete bank for merchant ID ${id}:`, error);
                return null; // Handle individual failure gracefully
              }
            })
          );

          return DefaultResponse(
            res,
            200,
            "Bank is deleted from merchant successfully",
            bankAccountResponses
          );
        } catch (error) {
          logger.info("Error during bank account deletions:", error);
        }
      } else {
        const data = {
          bankAccountId,
          merchantId,
        }

        const bankAccountRes = await bankAccountRepo.deleteBankFromMerchant(data);

        return DefaultResponse(
          res,
          200,
          "Bank is deleted from merchant successfully",
          bankAccountRes
        );
      }
    } catch (error) {
      logger.info(error);
    }
  }

  async updateBankAccountStates(req, res, next) {
    try {
      checkValidation(req);
      const data = req.body;

      const bankAccountRes = await bankAccountRepo.updateBankAccountStates(
        data
      );

      return DefaultResponse(
        res,
        200,
        "Bank Account state is updated successfully",
        bankAccountRes
      );
    } catch (error) {
      next(error);
    }
  }

  async getBankNickName(req, res, next) {
    try {
      checkValidation(req);
      const { nick_name } = req.query;

      const bankAccountRes = await bankAccountRepo.getBankNickName(nick_name);

      return DefaultResponse(
        res,
        200,
        "Bank Nick Name Already Exists",
        bankAccountRes
      );
    } catch (error) {
      next(error);
    }
  }
  async updateBankAccountDetails(req, res, next) {
    try {
      checkValidation(req);
      const data = req.body;
      const bankAccountRes = await bankAccountRepo.updateBankDataDetails(
        data
      );

      return DefaultResponse(
        res,
        200,
        "Bank Account state is updated successfully",
        bankAccountRes
      );
    } catch (error) {
      next(error);
    }
  }
}

export default new BankAccountController();
