import express from 'express'
import userController from '../controller/userController.js'
import { userCreateValidator } from '../helper/validators.js';

const userRouter = express()

userRouter.post('/create-user', userCreateValidator, userController.createUser)







export default userRouter;