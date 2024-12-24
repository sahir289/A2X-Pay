import userRepo from "../repository/userRepo.js";
import { logger } from "../utils/logger.js";

class UserService {

  async getAllUsers(skip, take, fullName, userName, role, createdBy, loggedInUserRole) {
    try {
      const users = await userRepo.getAllUsers(skip, take, fullName, userName, role, createdBy, loggedInUserRole);
      return users;
    } catch (error) {
      logger.info('Error fetching users:', error.message);
    }
  }
}

export default new UserService()