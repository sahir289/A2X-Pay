import express from 'express';
import payInController from '../controller/payInController.js';
import { payInAssignValidator } from '../helper/validators.js';


const payInRouter = express()

payInRouter.post('/payIn',payInAssignValidator, payInController.generatePayInUrl)

payInRouter.get('/validate-payIn-url/:payInId', payInController.validatePayInUrl)

payInRouter.get('/expire-payIn-url/:payInId', payInController.expirePayInUrl)

payInRouter.get('/check-payment-status/:payInId', payInController.checkPaymentStatus)

payInRouter.post('/process/:payInId',payInController.payInProcess)



// payInRouter.get('/getall-merchant',isAuthenticated, merchantController.getAllMerchants)



export default payInRouter;