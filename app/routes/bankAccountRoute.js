import express from "express";
import {
  bankAccountCreateValidator,
  merchantBankValidator,
} from "../helper/validators.js";
import bankAccountController from "../controller/bankAccountController.js";
import isAuthenticated from "../middlewares/authMiddleware.js";

const bankAccountRouter = express();

bankAccountRouter.post(
  "/create-bank",
  isAuthenticated,
  bankAccountCreateValidator,
  bankAccountController.createBankAccount
);

bankAccountRouter.put(
  "/update-bank-states",
  isAuthenticated,
  bankAccountController.updateBankAccountStates
);

bankAccountRouter.post(
  "/add-bank-merchant",
  isAuthenticated,
  merchantBankValidator,
  bankAccountController.addBankToMerchant
);

bankAccountRouter.get(
  "/merchant-bank",
  isAuthenticated,
  bankAccountController.getMerchantBank
);


bankAccountRouter.get(
  "/payin-bank",
  isAuthenticated,
  bankAccountController.getMerchantBank
);

//Get Payout Bank Route
bankAccountRouter.get(
  "/get-payout-bank",
  isAuthenticated,
  bankAccountController.getPayoutBank
);

bankAccountRouter.get(
  "/getall-bank",
  isAuthenticated,
  bankAccountController.getAllBankAccounts
);

bankAccountRouter.get(
  "/find-bank-nickname",
  isAuthenticated,
  bankAccountController.getBankNickName
);

bankAccountRouter.delete(
  "/delete-bank-merchant",
  isAuthenticated,
  bankAccountController.deleteBankFromMerchant
);

bankAccountRouter.get("/getAll-Payin-bank",
  isAuthenticated,
  bankAccountController.getPayinBank)

bankAccountRouter.put(
  "/update-bank-details",
  isAuthenticated,
  bankAccountController.updateBankAccountDetails
);

bankAccountRouter.post(
  "/get-bank-payouts",
  isAuthenticated,
  bankAccountController.getPayoutBankReport
);
export default bankAccountRouter;
