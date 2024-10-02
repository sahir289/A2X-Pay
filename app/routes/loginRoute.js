import express from 'express';
import loginController from '../controller/loginController.js';

const loginRouter = express()

loginRouter.post('/login',  loginController.login)
loginRouter.post('/verify-password',  loginController.comparePassword) // Password verification while edit and delete functionality

export default loginRouter;