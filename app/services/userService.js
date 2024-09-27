import userRepo from "../repository/userRepo.js";

class UserService {

  async getAllUsers(skip,take,fullName,userName,role, createdBy, loggedInUserRole) {

    const users = await userRepo.getAllUsers(skip, take, fullName, userName, role, createdBy, loggedInUserRole)

    return users

  }
}

export default new UserService()