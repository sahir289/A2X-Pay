import express from "express";
import { vendorCreateValidator } from "../helper/validators.js";
import vendorController from "../controller/vendorController.js";
import isAuthenticated from "../middlewares/authMiddleware.js";

const vendorRouter = express();

vendorRouter.post(
  "/create-vendor",
  isAuthenticated,
  vendorCreateValidator,
  vendorController.createVendor
);

vendorRouter.get(
  "/getall-vendor",
  isAuthenticated,
  vendorController.getAllVendors
);

export default vendorRouter;
