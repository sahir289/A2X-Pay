import { prisma } from '../client/prisma.js'
import { CustomError } from '../middlewares/errorHandler.js';
import { logger } from '../utils/logger.js';

class UserRepo {
    async createUserRepo(data) {
        try {
            const user = await prisma.user.create({
                data: data
            });
            return user;
        } catch (error) {
            logger.info('Error creating user:', error.message);
        }
    }

    async getUserByUsernameRepo(userName) {
        try {
            const userRes = await prisma.user.findUnique({
                where: {
                    userName: userName
                }
            });
            return userRes;
        } catch (error) {
            logger.info('Error fetching user by username:', error.message);
        }
    }

    async updateLastLoginByUserId(userId) {
        try {
            const userRes = await prisma.user.update({
                where: {
                    id: userId
                },
                data: {
                    last_login: new Date()
                }
            });
            return userRes;
        } catch (error) {
            logger.info('Error updating last login:', error.message);
        }
    }

    async validateUserId(userId) {
        try {
            const user = await prisma.user.findFirst({
                where: {
                    id: userId
                }
            });

            if (!user) {
                throw new CustomError("Invalid user id", 404);
            }

        } catch (error) {
            logger.info('Error validating user ID:', error.message);
        }
    }

    async getAllUsers(skip, take, fullName, userName, role, createdBy, loggedInUserRole) {
        try {
            const filters = {
                ...(fullName && { fullName: { contains: fullName, mode: 'insensitive' } }),
                ...(userName && { userName: { contains: userName, mode: 'insensitive' } }),
                ...(loggedInUserRole !== "ADMIN" && createdBy && { createdBy }),
                ...(loggedInUserRole === "ADMIN" && role && { role: { equals: role } }),
            };

            const users = await prisma.user.findMany({
                where: filters,
                skip: skip,
                take: take
            });

            const totalRecords = await prisma.user.count({
                where: filters,
            });

            return { users, totalRecords };
        } catch (error) {
            logger.info('Error fetching users:', error.message);
        }
    }

    async updateUser({ id, status }) {
        try {
            const user = await prisma.user.update({
                where: {
                    id: id
                },
                data: {
                    isEnabled: status
                }
            });
            return user;
        } catch (error) {
            logger.info('Error updating user:', error.message);
        }
    }

    async getMerchantAdminByUserId(userId) {
        try {
            const user = await prisma.user.findFirst({
                where: {
                    id: userId
                }
            });

            return user;
        } catch (error) {
            logger.info('Error fetching merchant admin by user ID:', error.message);
        }
    }

    async updateUserCodeWithNewMerchantCode(userId, code) {
        try {
            const res = await prisma.user.update({
                where: {
                    id: userId
                },
                data: {
                    code: code
                }
            });

            return res;
        } catch (error) {
            logger.info('Error updating user code with new merchant code:', error.message);
        }
    }
}

export default new UserRepo()