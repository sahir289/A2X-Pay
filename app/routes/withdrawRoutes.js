import express from 'express';
import withdrawController from '../controller/withdrawController.js';
import {
    payoutCreateValidator,
    settlementsGetValidator
} from '../helper/validators.js';

import isAuthenticated from '../middlewares/authMiddleware.js';

const withdrawRouter = express();
withdrawRouter.use(isAuthenticated);
withdrawRouter.post('/create-payout', payoutCreateValidator, withdrawController.createWithdraw);
withdrawRouter.get('/getall-payout', settlementsGetValidator, withdrawController.getWithdraw);
withdrawRouter.put('/update-payout/:id', withdrawController.updateWithdraw);
export default withdrawRouter;