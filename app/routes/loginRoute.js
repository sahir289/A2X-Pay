import express from 'express';
import loginController from '../controller/loginController.js';

const loginRouter = express()

loginRouter.post('/login',  loginController.login)

export default loginRouter;