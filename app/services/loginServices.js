import { CustomError } from "../middlewares/errorHandler.js";
import tokenRepo from "../repository/tokenRepo.js";
import userRepo from "../repository/userRepo.js";
import { generateAccessToken } from "../helper/utils.js";
import { comparePassword } from "../helper/passwordHelper.js";
import { logger } from "../utils/logger.js";

class LogInService {

  async login(userName, password, confirmOverRide) {
    const user = await userRepo.getUserByUsernameRepo(userName);
    if (!user) {
      throw new CustomError(404, "User not found");
    }

    if (!user.isEnabled) {
      throw new CustomError(403, "User is not enabled"); // 403 Forbidden - The user exists but is not verified.
    }

    const isPasswordValid = await comparePassword(password, user?.password);

    if (!isPasswordValid) {
      throw new CustomError(401, "Invalid credentials"); // 401 Unauthorized - The provided credentials (password) are invalid.
    }

    const isAccessTokenExists = await tokenRepo.getTokenByUserId(user?.id)
    if (!isAccessTokenExists) {
      const newAccessToken = generateAccessToken({ id: user.id, userName: user?.userName, role: user?.role, code: user.code, vendor_code: user?.vendor_code })
      await tokenRepo.createUserToken(newAccessToken, user?.id)
      return newAccessToken
    }
    else if (confirmOverRide) {
      const updateAccessToken = generateAccessToken({ id: user.id, userName: user?.userName, role: user?.role, code: user.code, vendor_code: user?.vendor_code })
      await tokenRepo.updateUserToken(updateAccessToken, isAccessTokenExists?.id)
      return updateAccessToken;
    } else {
      throw new CustomError(409, "User is already logged in somewhere else")
    }
  }

  // Verify Password while edit and delete functionality
  async comparePassword(userName, password) {
    try {
      const user = await userRepo.getUserByUsernameRepo(userName);
      const isPasswordValid = await comparePassword(password, user?.password);
      return isPasswordValid
    } catch (err) {
      logger.info(err);
    }
  }
}

export default new LogInService()