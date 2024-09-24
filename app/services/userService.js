import userRepo from "../repository/userRepo.js";

class UserService {
  async getAllUsers(page, pageSize, fullName, userName, role, createdBy) {
    const users = await userRepo.getAllUsers(
      page,
      pageSize,
      fullName,
      userName,
      role,
      createdBy
    );

    return users;
  }
}

export default new UserService();
