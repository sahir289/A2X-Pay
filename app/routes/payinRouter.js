import express from "express";
import multer from "multer";
import multerS3 from "multer-s3";
import config from "../../config.js";
import payInController from "../controller/payInController.js";
import { s3 } from "../helper/AwsS3.js";
import {
  payInAssignValidator,
  payInExpireURLValidator,
  payOutInAllDataValidator,
  validatePayInId,
  validatePayInIdAndAmountAssigned,
  validatePayInIdAndMerchant,
  validatePayInIdUrl,
  validatePayInProcess,
} from "../helper/validators.js";

const payInRouter = express();

const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: config?.bucketName,
    acl: "public-read", // Set the access control list (ACL) policy for the file
    key: function (req, file, cb) {
      cb(null, `uploads/${Date.now()}-${file.originalname}`); // Set the file path and name
    },
  }),
});

payInRouter.post(
  "/upload/:payInId",
  upload.single("file"),
  payInController.payInProcessByImg
);

payInRouter.post(
"/update-payment-status/:payInId",
  validatePayInIdUrl,
  payInController.updatePaymentStatus
);

payInRouter.get(
  "/payIn",
  payInAssignValidator,
  payInController.generatePayInUrl
);
//new payin router
payInRouter.post(
  "/get-all-payins",
  payOutInAllDataValidator,
  payInController.getAllPayInDataWithRange
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

payInRouter.post(
  "/payin-assignment",
  validatePayInIdAndMerchant,
  payInController.payinAssignment
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
  "/check-payin-status",
  validatePayInId,
  payInController.checkPayinStatus
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

payInRouter.post(
  "/expire-one-time-payin-url/:id",
  payInExpireURLValidator,
  payInController.expireOneTimeUrl
);

// telegram resp ocr
payInRouter.post("/tele-ocr", payInController.telegramResHandler)
payInRouter.get(
  "/get-payInDataVendor",
  payInController.getAllPayInDataByVendor
);
export default payInRouter;
