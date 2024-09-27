import express from "express";
import merchantController from "../controller/merchantController.js";
import { merchantCreateValidator } from "../helper/validators.js";
import isAuthenticated from "../middlewares/authMiddleware.js";

const merchantRouter = express();

merchantRouter.post(
  "/create-merchant",isAuthenticated,
  merchantCreateValidator,
  merchantController.createMerchant
);

merchantRouter.put(
  "/update-merchant",
  isAuthenticated,
  merchantController.updateMerchant
);

merchantRouter.get(
  "/get-merchant",
  isAuthenticated,
  merchantController.getMerchants
);

merchantRouter.get(
  "/getall-merchant",
  isAuthenticated,
  merchantController.getAllMerchants
);

merchantRouter.delete(
  "/delete-merchant",
  isAuthenticated,
  merchantController.deleteMerchant
)

export default merchantRouter;
