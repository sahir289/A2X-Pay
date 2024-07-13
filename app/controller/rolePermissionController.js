import { DefaultResponse } from "../helper/customResponse.js"
import { checkValidation } from "../helper/validationHelper.js"
import rolePermissionRepo from "../repository/rolePermissionRepo.js"

class RolePermissionController {
    async createRolePermission(req, res, next) {
        try {
            checkValidation(req)
            const data = req.body

            const rolePermissionResult = await rolePermissionRepo.createRolePermissionRepo(data)
            console.log("🚀 ~ RolePermissionController ~ createRolePermission ~ rolePermissionResult:", rolePermissionResult)

            return DefaultResponse(
                res,
                201,
                "Role-Permission is created successfully",
                rolePermissionResult
            );
        } catch (error) {
            console.log("🚀 ~ RolePermissionController ~ createRolePermission ~ error:", error)
            next(error)
        }
    }
}

export default new RolePermissionController()