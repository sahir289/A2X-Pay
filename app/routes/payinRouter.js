import express from 'express';
import payInController from '../controller/payInController.js';
import { payInAssignValidator } from '../helper/validators.js';


const payInRouter = express()

payInRouter.post('/payIn',payInAssignValidator, payInController.generatePayInUrl)

payInRouter.get('/validate-payIn-url/:payInId',payInAssignValidator, payInController.validatePayInUrl)

payInRouter.get('/expire-payIn-url/:payInId',payInAssignValidator, payInController.expirePayInUrl)





// payInRouter.get('/getall-merchant',isAuthenticated, merchantController.getAllMerchants)



export default payInRouter;