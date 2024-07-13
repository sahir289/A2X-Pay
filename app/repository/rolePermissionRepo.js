import { prisma } from '../client/prisma.js'

class RolePermissionRepo {
    async createRolePermissionRepo(data) {
        const permissions = await prisma.rolePermission.create({
            data: {
                role: data?.role,
                permissionId: data?.permissionId
            }
        })
        return permissions;
    }
}

export default new RolePermissionRepo()