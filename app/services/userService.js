import userRepo from "../repository/userRepo.js";

class UserService {

  async getAllUsers(skip,take,fullName,userName,role,createdBy) {

    const users = await userRepo.getAllUsers(skip, take, fullName, userName, role,createdBy)

    return users

  }
}

export default new UserService()