import express from "express";
import withdrawController from "../controller/withdrawController.js";
import {
  payoutCreateValidator,
  payOutInAllDataValidator,
  updateVendorCodeValidator,
  validatePayOutId,
  payoutGetValidator,
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
  "/create-blazePe-payout",
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
  "/check-blazePe-status",
  withdrawController.checkBlazepePayoutStatus
);

// this is the callback-api for blazePe, they will use this to update the transaction status
withdrawRouter.put(
  "/update-blazepe-payout-status/:id",
  withdrawController.updateBlazePePayoutStatus
);

withdrawRouter.post(
  "/check-payout-status",
  validatePayOutId,
  withdrawController.checkPayoutStatus
);

withdrawRouter.get(
  "/getall-payout",
  payoutGetValidator,
  isAuthenticated,
  withdrawController.getWithdraw
);

withdrawRouter.put(
  "/update-payout/:id",
  isAuthenticated,
  withdrawController.updateWithdraw
);

withdrawRouter.put(
  "/update-all-payout/:ids",
  // isAuthenticated,
  withdrawController.updateAllWithdraw
);   //PUT /update-all-eko-payout/1,2,3,4,5


withdrawRouter.put(
  "/update-vendor-code",
  updateVendorCodeValidator,
  isAuthenticated,
  withdrawController.updateVendorCode
);

withdrawRouter.post(
  "/get-all-vendor-payouts",
  payOutInAllDataValidator,
  // isAuthenticated,
  withdrawController.getAllVendorPayOutDataWithRange
);
//new payout router
withdrawRouter.post(
  "/get-all-payouts",
  payOutInAllDataValidator,
  isAuthenticated,
  withdrawController.getAllPayOutDataWithRange
);
export default withdrawRouter;
