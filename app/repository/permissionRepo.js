import {prisma} from '../client/prisma.js'

class PermissionRepo{
    async createPermissionRepo(data){
        const permissions = await prisma.permission.create({
            data:{
                name : data?.name,
                description : data?.description
            }
        })
        console.log("🚀 ~ PermissionRepo ~ createPermissionRepo ~ permissions:", permissions)
        return permissions;
    }
}

export default new PermissionRepo()