import userRepo from "../repository/userRepo.js";

class UserService {

  async getAllUsers(skip,take,fullName,userName,role) {

    const users = await userRepo.getAllUsers(skip, take, fullName, userName, role)

    return users

  }
}

export default new UserService()