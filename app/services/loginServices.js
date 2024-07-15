import { CustomError } from "../middlewares/errorHandler.js";
import tokenRepo from "../repository/tokenRepo.js";
import userRepo from "../repository/userRepo.js";
import { generateAccessToken } from "../helper/utils.js";
import { comparePassword } from "../helper/passwordHelper.js";

class LogInService {

  async login(userName, password) {

    const user = await userRepo.getUserByUsernameRepo(userName);

    if (!user.isEnabled) {
      throw new CustomError(403, "User is not enabled"); // 403 Forbidden - The user exists but is not verified.
    }

    const isPasswordValid = await comparePassword(password, user?.password);

    if (!isPasswordValid) {
      throw new CustomError(401, "Invalid credentials"); // 401 Unauthorized - The provided credentials (password) are invalid.
    }

    const isAccessTokemExtits = await tokenRepo.getTokenByUserId(user?.id)
    if (isAccessTokemExtits) {
      await tokenRepo.deleteokenByUserId(user?.id)
    }
    const newAccessToken = generateAccessToken({ id: user.id, userName: user?.userName, role: user?.role })
    await tokenRepo.createUserToken(newAccessToken, user?.id)

    

    return newAccessToken
  }
}

export default new LogInService()