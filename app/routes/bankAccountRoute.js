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

// Get Payin Bank Route
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


export default bankAccountRouter;
