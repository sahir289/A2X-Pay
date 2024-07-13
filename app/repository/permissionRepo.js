import {prisma} from '../client/prisma.js'

class PermissionRepo{
    async createPermissionRepo(data){
        const permissions = await prisma.permission.create({
            data:{
                name : data?.name,
                description : data?.description
            }
        })
        return permissions;
    }
}

export default new PermissionRepo()