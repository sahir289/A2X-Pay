import userRepo from "../repository/userRepo.js";

class UserService {
  async getAllUsers(page, pageSize, fullName, userName, role, createdBy, loggedInUserRole) {
    const users = await userRepo.getAllUsers(
      page,
      pageSize,
      fullName,
      userName,
      role,
      createdBy,
      loggedInUserRole
    );

    return users;
  }
}

export default new UserService();
