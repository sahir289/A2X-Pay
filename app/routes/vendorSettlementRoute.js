import express from 'express';
import vendorSettlementController from '../controller/vendorSettlementController.js';
import {
    settlementCreateValidator,
    settlementsGetValidator
} from '../helper/validators.js';

import isAuthenticated from '../middlewares/authMiddleware.js';

const settlementRouter = express();
settlementRouter.post('/create-vendorsettlement', settlementCreateValidator, isAuthenticated,vendorSettlementController.createSettlement);
settlementRouter.get('/getall-vendorsettlement', settlementsGetValidator,isAuthenticated, vendorSettlementController.getSettlement);
settlementRouter.put('/update-vendorsettlement/:id',isAuthenticated, vendorSettlementController.updateSettlement);
export default settlementRouter;