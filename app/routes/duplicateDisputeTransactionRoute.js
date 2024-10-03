import express from 'express';
import duplicateDisputeTransactionController from '../controller/duplicateDisputeTransactionController.js';

const duplicateDisputeTransactionRouter = express()

duplicateDisputeTransactionRouter.put('/update-duplicatedisputetransaction/:payInId', duplicateDisputeTransactionController.handleDuplicateDisputeTransaction)

export default duplicateDisputeTransactionRouter;