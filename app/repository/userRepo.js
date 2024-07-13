import { prisma } from '../client/prisma.js'

class UserRepo {
    async createUserRepo(data) {
        const user = await prisma.user.create({
            data: data
        })
        return user;
    }

    async getUserByUsernameRepo(userName) {
        const userRes = await prisma.user.findUnique({
            where:{
                userName : userName
            }
        })
        console.log("🚀 ~ UserRepo ~ getUserByUsernameRepo ~ userRes:", userRes)
        return userRes;
    }
}

export default new UserRepo()