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
            console.log("🚀 ~ UserController ~ createUser ~ data:", data)

            const isUserExist = await userRepo.getUserByUsernameRepo(data?.userName)
            console.log("🚀 ~ UserController ~ createUser ~ isUserExist:", isUserExist)

            if (isUserExist){
               throw new CustomError(409,'User with this username already exist')
            }

            const hashedPassword =await hashPassword(req.body?.password)
            console.log("🚀 ~ UserController ~ createUser ~ hashPassword:", hashPassword)

            const updatedData ={
                ...data,
                password:hashedPassword
            }
            console.log("🚀 ~ UserController ~ createUser ~ data:", updatedData)

            const userRes = await userRepo.createUserRepo(data)
            console.log("🚀 ~ UserController ~ createUser ~ data:", data)
            
            return DefaultResponse(
                res,
                201,
                "User is created successfully",
                userRes
            );
        } catch (error) {
            console.log("🚀 ~ UserController ~ createUser ~ error:", error)
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