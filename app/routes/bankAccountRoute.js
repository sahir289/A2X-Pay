import express from 'express';
import { bankAccountCreateValidator, merchantBankValidator } from '../helper/validators.js';
import bankAccountController from '../controller/bankAccountController.js';


const bankAccountRouter = express()

bankAccountRouter.post('/create-bank', bankAccountCreateValidator, bankAccountController.createBankAccount)

bankAccountRouter.post('/add-bank-merchant', merchantBankValidator, bankAccountController.addBankToMerchant)

bankAccountRouter.get('/merchant-bank', bankAccountController.getMerchantBank)


// bankAccountRouter.get('/getall-merchant',isAuthenticated, merchantController.getAllMerchants)



export default bankAccountRouter;