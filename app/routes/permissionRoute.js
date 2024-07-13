import express from 'express'
import permissionController from '../controller/permissionController.js';
import { permissionValidator } from '../helper/validators.js';


const permissionRouter = express()

permissionRouter.post('/create-permission',permissionValidator, permissionController.createPermission)







export default permissionRouter;