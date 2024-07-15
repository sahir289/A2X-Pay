import { prisma } from '../client/prisma.js'
import { CustomError } from '../middlewares/errorHandler.js';

class UserRepo {
    async createUserRepo(data) {
        const user = await prisma.user.create({
            data: data
        })
        return user;
    }

    async getUserByUsernameRepo(userName) {
        const userRes = await prisma.user.findUnique({
            where: {
                userName: userName
            }
        })

        return userRes;
    }

    async updateLastLoginByUserId(userId) {
        const userRes = await prisma.user.update({
            where: {
                id: userId
            },
            data: {
                last_login: new Date()
            }
        })

        return userRes;
    }

    async validateUserId(userId) {
        const user = await prisma.user.findFirst({
            where: {
                id: userId
            }
        })
        if (!user) {
            throw new CustomError("Invalid user id", 404)
        }
    }

    async getAllUsers(skip, take, fullName, userName, role) {
        const user = await prisma.user.findMany({
            where: {
                fullName: {
                    contains: fullName,
                    mode: 'insensitive'
                },
                userName: {
                    contains: userName,
                    mode: 'insensitive'
                },
                role: {
                    equals: role,
                }
            },
            skip: skip,
            take: take
        })
        const totalRecords = await prisma.user.count({
            where: {
                fullName: {
                    contains: fullName,
                    mode: 'insensitive',
                },
                userName: {
                    contains: userName,
                    mode: 'insensitive',
                },
                role: {
                    equals: role,
                },
            },
        });
        return { user, totalRecords }
    }
}

export default new UserRepo()