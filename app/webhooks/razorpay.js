import payInRepo from '../repository/payInRepo.js';
import { calculateCommission } from '../helper/utils.js';
import merchantRepo from '../repository/merchantRepo.js';
import axios from 'axios';
import bankAccountRepo from '../repository/bankAccountRepo.js';
import { logger } from '../utils/logger.js';
import Razorpay from 'razorpay';
import { validateWebhookSignature } from 'razorpay/dist/utils/razorpay-utils.js';

export const razorpay = new Razorpay({
    key_id: process.env.RAZOR_PAY_ID,
    key_secret: process.env.RAZOR_PAY_SECRET
})

const RazorHook = async (req, res) => {
    res.json({status: 200, message: 'RazorPay Webhook Called successfully'});
    try {
        const webhookSecret = 'trust-pay-stg#001188';
        const receivedSignature = req.headers['x-razorpay-signature'];
        const data = req.body?.payload?.payment?.entity || {};
        validateWebhookSignature(JSON.stringify(req.body), receivedSignature, webhookSecret);
        
        // transaction id will be passed from our payment-site as email
        const { email, amount: razorAmount, id, acquirer_data } = data;
        const amount = razorAmount / 100;
        const sno = (email || "").replace(".trustpay@gmail.com", "");
        let status = 'PENDING';
        logger.info({ status, sno });

        switch (req.body.event) {
            case "payment.authorized":
                await razorpay.payments.capture(id, razorAmount, data.currency || "INR");
                status = "SUCCESS";
                break;
            case "payment.captured":
                status = "SUCCESS";
                break;
            case "payment.failed":
                status = "FAILED";
                break;
            default:
                // log and exit for unhandled events
                logger.error("Unhandled event:", req.body.event);
                return;
        }

        // if webhook is called with none of handled events or transaction id not received
        if (!status || !sno) {
            logger.error("Status or sno not found!");
            return;
        }

        const payInData = await payInRepo.getPayInData(sno, true);
        if (!payInData) {
            throw new Error("Payment does not exist");
        }

        const merchantData = await merchantRepo.getMerchantById(payInData.merchant_id);
        if (!merchantData) {
            logger.error("Merchant not found!");
            return;
        }

        const durMs = new Date() - payInData.createdAt;
        const durSeconds = Math.floor((durMs / 1000) % 60).toString().padStart(2, '0');
        const durMinutes = Math.floor((durSeconds / 60) % 60).toString().padStart(2, '0');
        const durHours = Math.floor((durMinutes / 60) % 24).toString().padStart(2, '0');
        const duration = `${durHours}:${durMinutes}:${durSeconds}`;

        const payload = {
            confirmed: amount,
            status,
            is_notified: true,
            approved_at: new Date(),
            duration,
            utr: acquirer_data?.rrn,
            user_submitted_utr: acquirer_data?.rrn,
            method: 'RazorPay',
        };

        if (status === "SUCCESS") {
            const payinCommission = calculateCommission(amount, merchantData.payin_commission);
            payload.payin_commission = payinCommission;
        }

        const updatePayInDataRes = await payInRepo.updatePayInData(payInData.id, payload);

        if (payInData.bank_acc_id) {
            await bankAccountRepo.updateBankAccountBalance(payInData.bank_acc_id, parseFloat(amount));
        }

        await merchantRepo.updateMerchant(payInData.merchant_id, amount);

        const notifyData = {
            status,
            merchantOrderId: updatePayInDataRes?.merchant_order_id,
            payinId: updatePayInDataRes?.id,
            amount: updatePayInDataRes?.confirmed,
            utr_id: updatePayInDataRes?.utr
        };

        await axios.post(payInData.notify_url, notifyData).catch((err) => {
            logger.error("Error notifying merchant:", err);
        });

        logger.info("Transaction status updated successfully");
    } catch (err) {
        logger.error("Razorpay webhook error", err);
    }
};


export default RazorHook;