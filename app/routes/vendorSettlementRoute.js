import express from 'express';
import vendorSettlementController from '../controller/vendorSettlementController.js';
import {
    settlementCreateValidator,
    settlementsGetValidator
} from '../helper/validators.js';

import isAuthenticated from '../middlewares/authMiddleware.js';

const settlementRouter = express();
settlementRouter.use(isAuthenticated);
settlementRouter.post('/create-vendorsettlement', settlementCreateValidator, vendorSettlementController.createSettlement);
settlementRouter.get('/getall-vendorsettlement', settlementsGetValidator, vendorSettlementController.getSettlement);
settlementRouter.put('/update-vendorsettlement/:id', vendorSettlementController.updateSettlement);
export default settlementRouter;