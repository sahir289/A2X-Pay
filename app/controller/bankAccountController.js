import { DefaultResponse } from "../helper/customResponse.js";
import { checkValidation } from "../helper/validationHelper.js";
import bankAccountRepo from "../repository/bankAccountRepo.js";

class BankAccountController {
    async createBankAccount(req, res, next) {
        try {
            checkValidation(req)
            const data = req.body;

            const bankAccountRes = await bankAccountRepo.createBankAccount(data)

            return DefaultResponse(
                res,
                201,
                "Bank Account is created successfully",
                bankAccountRes
            );
        } catch (error) {
            next(error)
        }
    }

    async addBankToMerchant (req, res, next) {
        try {
            checkValidation(req)
            const data = req.body;

            const bankAccountRes = await bankAccountRepo.addBankToMerchant(data)

            return DefaultResponse(
                res,
                201,
                "Bank is added to merchant successfully",
                bankAccountRes
            );
        } catch (error) {
            next(error)
        }
    }

    // to get the merchant bank
    async getMerchantBank(req, res, next) {
        try {
            checkValidation(req)
            const { id } = req.query;
            const bankAccountRes = await bankAccountRepo.getMerchantBankById(id)

            return DefaultResponse(
                res,
                200,
                "Merchant Bank details get successfully",
                bankAccountRes
            );
        } catch (error) {
            next(error)
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
}

export default new BankAccountController()