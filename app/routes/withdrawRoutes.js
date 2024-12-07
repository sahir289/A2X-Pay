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

withdrawRouter.put(
  "/activate-eko-service",
  withdrawController.activateEkoService
);

withdrawRouter.post(
  "/initiate-payout-eko",
  withdrawController.createEkoWithdraw
);

withdrawRouter.get(
  "/status-payout-eko/:id",
  withdrawController.ekoPayoutStatus
);

withdrawRouter.get(
  "/eko-wallet-balance-enquiry",
  withdrawController.ekoWalletBalanceEnquiry
);

// this is the callback-api for eko, they will use this to update the transaction status
withdrawRouter.post(
  "/transaction-status-callback-eko",
  withdrawController.ekoTransactionStatusCallback
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
  settlementsGetValidator,
  isAuthenticated,
  withdrawController.getWithdraw
);

withdrawRouter.put(
  "/update-payout/:id",
  isAuthenticated,
  withdrawController.updateWithdraw
);

withdrawRouter.put(
  "/update-vendor-code",
  updateVendorCodeValidator,
  isAuthenticated,
  withdrawController.updateVendorCode
);

//new payout router
withdrawRouter.post(
  "/get-all-payouts",
  payOutInAllDataValidator,
  isAuthenticated,
  withdrawController.getAllPayOutDataWithRange
);
export default withdrawRouter;
