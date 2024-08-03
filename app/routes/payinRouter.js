import express from "express";
import payInController from "../controller/payInController.js";
import {
  payInAssignValidator,
  validatePayInIdAndAmountAssigned,
  validatePayInIdUrl,
  validatePayInProcess,
} from "../helper/validators.js";
import multer from "multer";

const payInRouter = express();

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./public/Images");
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now();
    cb(null, uniqueSuffix + file.originalname);
  },
});

const upload = multer({ storage: storage });

payInRouter.post(
  "/upload/:payInId",
  upload.single("file"),
  payInController.payInProcessByImg
);

payInRouter.post(
  "/payIn",
  payInAssignValidator,
  payInController.generatePayInUrl
);

payInRouter.get(
  "/validate-payIn-url/:payInId",
  validatePayInIdUrl,
  payInController.validatePayInUrl
);

payInRouter.post(
  "/assign-bank/:payInId",
  validatePayInIdAndAmountAssigned,
  payInController.assignedBankToPayInUrl
);

payInRouter.get(
  "/expire-payIn-url/:payInId",
  validatePayInIdUrl,
  payInController.expirePayInUrl
);

payInRouter.get(
  "/check-payment-status/:payInId",
  validatePayInIdUrl,
  payInController.checkPaymentStatus
);

payInRouter.post(
  "/process/:payInId",
  validatePayInProcess,
  payInController.payInProcess
);

payInRouter.get("/get-payInData", payInController.getAllPayInData);

payInRouter.get(
  "/get-payInDataMerchant",
  payInController.getAllPayInDataByMerchant
);

export default payInRouter;
