import { hashPassword } from "../helper/passwordHelper.js";
import { checkValidation } from "../helper/validationHelper.js";
import { CustomError, customError } from "../middlewares/errorHandler.js";
import { DefaultResponse } from "../helper/customResponse.js"
import userRepo from "../repository/userRepo.js";

class UserController {
    async createUser(req, res, next) {
        try {
            checkValidation(req)
            const data = req.body;

            const isUserExist = await userRepo.getUserByUsernameRepo(data?.userName)

            if (isUserExist){
               throw new CustomError(409,'User with this username already exist')
            }

            const hashedPassword =await hashPassword(req.body?.password)

            const updatedData ={
                ...data,
                password:hashedPassword
            }

            const userRes = await userRepo.createUserRepo(data)
            
            return DefaultResponse(
                res,
                201,
                "User is created successfully",
                userRes
            );
        } catch (error) {
            next(error)
        }
    }

    // async getUser(req, res, next) {
    //     try {
    //         checkValidation(req)
            
          
            
    //         return DefaultResponse(
    //             res,
    //             201,
    //             "User is created successfully",
    //             userRes
    //         );
    //     } catch (error) {
    //         next(error)
    //     }
    // }
}

export default new UserController()