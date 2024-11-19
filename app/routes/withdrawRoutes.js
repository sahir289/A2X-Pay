import express from "express";
import withdrawController from "../controller/withdrawController.js";
import {
  payoutCreateValidator,
  settlementsGetValidator,
  payOutInAllDataValidator,
  updateVendorCodeValidator,
  validatePayOutId,
} from "../helper/validators.js";

import isAuthenticated from "../middlewares/authMiddleware.js";

const withdrawRouter = express();

// Do not move it down bellow  as we do not want to use isAuthenticated in this.
withdrawRouter.post(
  "/create-payout",
  payoutCreateValidator,
  withdrawController.createWithdraw
);

withdrawRouter.post(
  "/check-blazePe-status",
  withdrawController.createBlazepeWithdraw
);

withdrawRouter.post(
  "/create-blazePe-payout",
  withdrawController.checkBlazepePayoutStatus
);

withdrawRouter.post(
  "/check-payout-status",
  validatePayOutId,
  withdrawController.checkPayoutStatus
);


withdrawRouter.get(
  "/getall-payout",
  settlementsGetValidator,isAuthenticated,
  withdrawController.getWithdraw
);

withdrawRouter.put("/update-payout/:id",isAuthenticated, withdrawController.updateWithdraw);


withdrawRouter.put(
  "/update-vendor-code",
  updateVendorCodeValidator,isAuthenticated,
  withdrawController.updateVendorCode
);

//new payout router
withdrawRouter.post(
  "/get-all-payouts",
  payOutInAllDataValidator,isAuthenticated,
  withdrawController.getAllPayOutDataWithRange
);
export default withdrawRouter;
