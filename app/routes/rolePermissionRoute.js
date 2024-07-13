import express from 'express';
import rolePermissionController from '../controller/rolePermissionController.js';
import { rolePermissionValidator } from '../helper/validators.js';


const rolePermissionRouter = express()

rolePermissionRouter.post('/create-role-permission', rolePermissionValidator, rolePermissionController.createRolePermission)



export default rolePermissionRouter;