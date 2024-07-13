import { CustomError } from "../middlewares/errorHandler.js";
import userRepo from "../repository/userRepo.js";

class LogInService {
    
    async login(userName, password) {
        console.log("🚀 ~ LogInService ~ login ~ password:", password)
        console.log("🚀 ~ LogInService ~ login ~ userName:", userName)
        
        const user = await userRepo.getUserByUsernameRepo(userName);
        console.log("🚀 ~ LogInService ~ login ~ user:", user)
    
        if (!user) {
          throw new CustomError(404, "User does not exist"); // 404 Not Found - The user with the given email does not exist.
        }
    
        if (!user.isEnabled) {
          console.log("🚀 ~ LogInService ~ login ~ user.isEnable:", user.isEnabled)
          throw new CustomError(403, "User is not enabled"); // 403 Forbidden - The user exists but is not verified.
        }
    
        // const companyRoleStatus = user.companies[0]?.role?.status;
        // if (!companyRoleStatus) {
        //   throw new CustomError(403, "User is not allowed to login"); // 403 Forbidden - The user's role status does not allow login.
        // }
    
        // const isPasswordValid = await comparePassword(password, user.password!);
    
        // if (!isPasswordValid) {
        //   throw new CustomError(401, "Invalid credentials"); // 401 Unauthorized - The provided credentials (password) are invalid.
        // }
    
        // const decodedToken = decode(user?.accessToken);
        // if (!decodedToken || isTokenExpired(decodedToken?.exp)) {
        //   // Token cannot be verified or is expired, generate a new one
        //   const newAccessToken = generateAccessToken({
        //     id: user.id,
        //     email,
        //     companyId: user.companies[0].companyId,
        //   });
    
        //   await tokenRepository.updateToken(email, newAccessToken);
    
        //   // Fetch the updated user with the new token
        //   const updatedUser = await userRepository.getByEmail(email);
    
        //   // Log in the user with the new token
        //   return updatedUser;
        // } else if (confirmOverRide) {
        //   // Existing token is valid and confirmOverRide is true, generate a new one
        //   const newAccessToken = generateAccessToken({
        //     id: user.id,
        //     email,
        //     companyId: user.companies[0].companyId,
        //   });
    
        //   await tokenRepository.updateToken(email, newAccessToken);
    
        //   // Fetch the updated user with the new token
        //   const updatedUser = await userRepository.getByEmail(email);
    
        //   // Log in the user with the new token
        //   return updatedUser;
        // } else {
        //   // Existing token is valid, but confirmOverRide is false, throw an error
        //   throw new CustomError(409, "User is already logged in somewhere else");
        // }
      }
}

export default new LogInService()