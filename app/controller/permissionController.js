import { DefaultResponse } from "../helper/customResponse.js"
import { checkValidation } from "../helper/validationHelper.js"
import permissionRepo from "../repository/permissionRepo.js"

class PermissionController {
    async createPermission(req, res, next) {
        try {
            checkValidation(req)
            const data = req.body
            console.log("🚀 ~ PermissionController ~ createPermission ~ data:", data)

            const permissionResult = await permissionRepo.createPermissionRepo(data)
            console.log("🚀 ~ PermissionController ~ createPermission ~ permissionResult:", permissionResult)

            return DefaultResponse(
                res,
                201,
                "Permission is created successfully",
                permissionResult
            );
        } catch (error) {
            console.log("🚀 ~ PermissionController ~ createPermission ~ error:", error)
            next(error)
        }
    }
}

export default new PermissionController()