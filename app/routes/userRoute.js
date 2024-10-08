import express from 'express'
import userController from '../controller/userController.js'
import { userCreateValidator } from '../helper/validators.js';
import isAuthenticated from '../middlewares/authMiddleware.js';

const userRouter = express()

userRouter.post('/create-user', userCreateValidator, userController.createUser)

userRouter.get('/getall-users', isAuthenticated, userController.getAllUser)

userRouter.put('/update-status', isAuthenticated, userController.updateUser)

userRouter.post('/request-reset-password', userController.requestResetPassword);

userRouter.post('/reset-password', userController.resetPassword);





export default userRouter;