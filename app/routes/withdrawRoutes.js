import express from 'express';
import withdrawController from '../controller/withdrawController.js';
import {
    payoutCreateValidator,
    settlementsGetValidator,
    payOutInAllDataValidator,
    updateVendorCodeValidator,

} from '../helper/validators.js';

import isAuthenticated from '../middlewares/authMiddleware.js';

const withdrawRouter = express();
withdrawRouter.use(isAuthenticated);
withdrawRouter.post('/create-payout', payoutCreateValidator, withdrawController.createWithdraw);
withdrawRouter.get('/getall-payout', settlementsGetValidator, withdrawController.getWithdraw);
withdrawRouter.put('/update-payout/:id', withdrawController.updateWithdraw);
withdrawRouter.put('/update-vendor-code', updateVendorCodeValidator , withdrawController.updateVendorCode);

//new payout router
withdrawRouter.get("/get-all-payouts", payOutInAllDataValidator, withdrawController.getAllPayOutDataWithRange);
export default withdrawRouter;