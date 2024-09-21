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

    async getAllUsers(skip, take, fullName, userName, role,createdBy) {
        const filters = {
            ...(fullName && { fullName: { contains: fullName, mode: 'insensitive' } }),
            ...(userName && { userName: { contains: userName, mode: 'insensitive' } }),
            ...(role && { role: { equals: role } }),
            // ...(role !== "ADMIN" && createdBy && { createdBy }) 
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
    }
    async updateUser({id,status}) {
        const user = await prisma.user.update({
            where:{
                id:id
            },
            data: {
                isEnabled:status
            }
        })
        return user;
    }
    
}

export default new UserRepo()