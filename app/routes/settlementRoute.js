import express from 'express';
import settlementController from '../controller/settlementController.js';
import {
    settlementCreateValidator,
    settlementsGetValidator
} from '../helper/validators.js';

import isAuthenticated from '../middlewares/authMiddleware.js';

const settlementRouter = express();
settlementRouter.use(isAuthenticated);
settlementRouter.post('/create-settlement', settlementCreateValidator, settlementController.createSettlement);
settlementRouter.get('/getall-settlement', settlementsGetValidator, settlementController.getSettlement);
export default settlementRouter;