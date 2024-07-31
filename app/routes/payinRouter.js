import express from 'express';
import payInController from '../controller/payInController.js';
import { payInAssignValidator, validatePayInIdAndAmountAssigned, validatePayInIdUrl, validatePayInProcess } from '../helper/validators.js';


const payInRouter = express()

payInRouter.post('/payIn',payInAssignValidator, payInController.generatePayInUrl)

payInRouter.get('/validate-payIn-url/:payInId',validatePayInIdUrl, payInController.validatePayInUrl)

payInRouter.post('/assign-bank/:payInId',validatePayInIdAndAmountAssigned, payInController.assignedBankToPayInUrl)


payInRouter.get('/expire-payIn-url/:payInId',validatePayInIdUrl, payInController.expirePayInUrl)

payInRouter.get('/check-payment-status/:payInId',validatePayInIdUrl, payInController.checkPaymentStatus)

payInRouter.post('/process/:payInId',validatePayInProcess,payInController.payInProcess)

payInRouter.get('/get-payInData',payInController.getAllPayInData)




export default payInRouter;