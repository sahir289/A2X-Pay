import { hashPassword } from "../helper/passwordHelper.js";
import { checkValidation } from "../helper/validationHelper.js";
import { CustomError, customError } from "../middlewares/errorHandler.js";
import { DefaultResponse } from "../helper/customResponse.js"
import userRepo from "../repository/userRepo.js";
import userService from "../services/userService.js";
import merchantRepo from "../repository/merchantRepo.js";

class UserController {
    async createUser(req, res, next) {
        try {
            checkValidation(req)  // when first user/admin is created we have to allow the user without any created by.
            const data = req.body;

            const isUserExist = await userRepo.getUserByUsernameRepo(data?.userName)

            if (isUserExist) {
                throw new CustomError(409, 'User with this username already exist')
            }

            if (req.body.role === "MERCHANT" || req.body.role === "MERCHANT_ADMIN") {
                if (!req?.body?.code) {
                    throw new CustomError(409, 'merchant code is required')
                }
            }

            const hashedPassword = await hashPassword(req.body?.password)

            const updatedData = {
                ...data,
                password: hashedPassword
            }

            if (req.body.role === "MERCHANT_ADMIN") {
                updatedData.merchantAdminCode = String(req?.body?.code)

                const updateMerchantAdmin = await merchantRepo?.updateIsMerchantAdminByCode(String(req?.body?.code))
            }
            const userRes = await userRepo.createUserRepo(updatedData)

            return DefaultResponse(
                res,
                201,
                "User is created successfully",
                // userRes
            );
        } catch (error) {
            next(error)
        }
    }


    async getAllUser(req, res, next) {
        try {
            checkValidation(req)
            const { id: userId, loggedInUserRole } = req.user
            
            const { name: fullName, userName, role, createdBy } = req.query;
            const roles = ['ADMIN', 'CUSTOMER_SERVICE', 'TRANSACTIONS', 'OPERATIONS', 'MERCHANT', 'VENDOR', 'VENDOR_OPERATIONS', 'MERCHANT_OPERATIONS', 'MERCHANT_ADMIN']

            if (!roles.includes(loggedInUserRole.toUpperCase())) {
              throw new CustomError(400, "Not authorized to access");
            }

            const page = parseInt(req.query.page) || 1;
            const pageSize = parseInt(req.query.pageSize) || 15

            const skip = (page - 1) * pageSize
            const take = pageSize

            await userRepo.validateUserId(userId)

            const users = await userService.getAllUsers(skip, take, fullName, userName, role, createdBy, loggedInUserRole)
            return DefaultResponse(
                res,
                201,
                "Users fetched successfully",
                users
            );
        } catch (error) {
            next(error)
        }
    }

    async updateUser(req, res, next) {
        try {
            checkValidation(req)
            const { id: userId } = req.user

            const { id: updateUserId, status } = req.body;

            await userRepo.validateUserId(userId)
            await userRepo.validateUserId(updateUserId)

            const users = await userRepo.updateUser({ id: updateUserId, status })

            return DefaultResponse(
                res,
                201,
                "Users updated successfully",
                users
            );
        } catch (error) {
            next(error)
        }
    }
}

export default new UserController()