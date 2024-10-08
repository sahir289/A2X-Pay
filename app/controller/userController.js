import { hashPassword } from "../helper/passwordHelper.js";
import { checkValidation } from "../helper/validationHelper.js";
import { CustomError, customError } from "../middlewares/errorHandler.js";
import { DefaultResponse } from "../helper/customResponse.js"
import userRepo from "../repository/userRepo.js";
import userService from "../services/userService.js";
import sendOtpEmail  from "../services/emailService.js";

class UserController {
    async createUser(req, res, next) {
        try {
            checkValidation(req)  // when first user/admin is created we have to allow the user without any created by.
            const data = req.body;

            const isUserExist = await userRepo.getUserByUsernameRepo(data?.userName)

            if (isUserExist) {
                throw new CustomError(409, 'User with this username already exist')
            }

            if (req.body.role ==="MERCHANT"){
                if(!req?.body?.code){
                    throw new CustomError(409, 'merchant code is required')
                }
            }

            const hashedPassword = await hashPassword(req.body?.password)

            const updatedData = {
                ...data,
                password: hashedPassword
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

            const page = parseInt(req.query.page) || 1;
            const pageSize = parseInt(req.query.pageSize) || 15

            const { name: fullName, userName, role ,createdBy} = req.query;
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

            const { id:updateUserId,status} = req.body;

            await userRepo.validateUserId(userId) 
            await userRepo.validateUserId(updateUserId)

            const users = await userRepo.updateUser({id:updateUserId,status})

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
    async requestResetPassword(req, res, next) {
        try {
            const { email } = req.body;

            // Check if user exists
            const user = await prisma.user.findUnique({ where: { email } });
            if (!user) {
                return DefaultResponse(res, 404, "User not found");
            }

            // Generate OTP
            const otp = Math.floor(100000 + Math.random() * 900000); // 6-digit OTP
            const otpExpiry = new Date(Date.now() + 2 * 60 * 1000); // 2 minutes expiry

            // Update user with OTP and expiry
            await prisma.user.update({
                where: { email },
                data: { otp, otpExpiry },
            });
            const subject = "TrustPay: Reset Your Password";
            const html = `
      <h1>Password Reset Request</h1>
      <p>Hello,</p>
      <p>You requested a password reset for your TrustPay account. Here is your OTP:</p>
      <h2 style="color: #007BFF;">${otp}</h2>
      <p>This OTP is valid for 10 minutes.</p>
      <p>If you did not request this, please ignore this email.</p>
      <p>Thank you!</p>
      <p>The TrustPay Team</p>
    `;

            await sendEmail(email, subject, `Your OTP code is ${otp}`, html);
            // Send response with OTP
            return DefaultResponse(res, 200, "OTP sent to email");
        } catch (error) {
            next(error);
        }
    }
    async resetPassword(req, res, next) {
        try {
            const { email, otp, newPassword } = req.body;

            // Find user
            const user = await prisma.user.findUnique({ where: { email } });
            if (!user) {
                return DefaultResponse(res, 404, "User not found");
            }

            // Validate OTP
            if (user.otp !== otp || new Date() > user.otpExpiry) {
                return DefaultResponse(res, 400, "Invalid or expired OTP");
            }

            // Hash the new password
            const hashedPassword = await bcrypt.hash(newPassword, 10);

            // Update user password and clear OTP
            await prisma.user.update({
                where: { email },
                data: {
                    password: hashedPassword,
                    otp: null,
                    otpExpiry: null,
                },
            });

            return DefaultResponse(res, 200, "Password has been reset successfully");
        } catch (error) {
            next(error);
        }
    }
    
}

export default new UserController()