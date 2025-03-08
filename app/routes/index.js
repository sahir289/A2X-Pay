import express from "express";
import { customError, notFound } from "../middlewares/errorHandler.js";
import loginRouter from "./loginRoute.js";
import userRouter from "./userRoute.js";
import merchantRouter from "./merchatRoutes.js";
import bankAccountRouter from "./bankAccountRoute.js";
import payInRouter from "./payinRouter.js";
import botResRouter from "./botResponseRouter.js";
import settlementRouter from "./settlementRoute.js";
import payoutRouter from "./withdrawRoutes.js";
import vendorRouter from "./vendor.js";
import vendorSettlementRouter from "./vendorSettlementRoute.js";
import duplicateDisputeTransactionRouter from "./duplicateDisputeTransactionRoute.js";
import lienRouter from "./lienRouter.js";
import weeklyReportRouter from "./weeklyReportRouter.js";
import { PayUHook, RazorHook } from "../webhooks/index.js";
import A2Pay from "../webhooks/a2Pay.js";

const router = express();

// Because we are not using the isAuthenticated at the time of create payout so it has to stay on top. otherwise it will give error

router.use("/v1", loginRouter)
router.use("/v1", payInRouter);
router.use("/v1", payoutRouter);

router.use("/v1", userRouter);
router.use("/v1", merchantRouter);
router.use("/v1", vendorRouter);
router.use("/v1", bankAccountRouter);
router.use("/v1", botResRouter);
router.use("/v1", settlementRouter);
router.use("/v1", vendorSettlementRouter);
router.use("/v1", duplicateDisputeTransactionRouter); // add router to handle duplicate and disputed transaction
router.use("/v1", lienRouter);
router.use("/v1", weeklyReportRouter);
router.all("/v1/webhook/razor-pay-callback", RazorHook);
router.all("/v1/webhook/payU/success", PayUHook);
router.all("/v1/webhook/payU/failure", PayUHook);
router.all("/v1/webhook/a2Pay", A2Pay);



// Middleware for handling 404 errors
router.use(notFound);

// Register the custom error handling middleware after all routes
router.use(customError);

export default router;
