import express from 'express';
import settlementController from '../controller/settlementController.js';
import {
    settlementCreateValidator,
    settlementsGetValidator
} from '../helper/validators.js';

import isAuthenticated from '../middlewares/authMiddleware.js';

const settlementRouter = express();
settlementRouter.post('/create-settlement', settlementCreateValidator,isAuthenticated, settlementController.createSettlement);
settlementRouter.get('/getall-settlement', settlementsGetValidator,isAuthenticated, settlementController.getSettlement);
settlementRouter.put('/update-settlement/:id',isAuthenticated, settlementController.updateSettlement);
export default settlementRouter;