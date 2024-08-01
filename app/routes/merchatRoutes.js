import express from "express";
import merchantController from "../controller/merchantController.js";
import { merchantCreateValidator } from "../helper/validators.js";
import isAuthenticated from "../middlewares/authMiddleware.js";

const merchantRouter = express();

merchantRouter.post(
  "/create-merchant",
  merchantCreateValidator,
  merchantController.createMerchant
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

export default merchantRouter;
