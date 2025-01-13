import express from 'express';
import crypto from "crypto";
import payInRepo from '../repository/payInRepo.js';
import { calculateCommission } from '../helper/utils.js';
import merchantRepo from '../repository/merchantRepo.js';
import axios from 'axios';
import bankAccountRepo from '../repository/bankAccountRepo.js';
const razorHook = express();
razorHook.use('/webhook/razor-pay', async (req, res) => {
    try {
        const webhookSecret = '';
        const receivedSignature = req.headers['X-Razorpay-Signature'];
        const data = data?.payload?.payment?.entity || {};
        const expectedSignature = crypto.createHmac('sha256', webhookSecret).update(JSON.stringify(data)).digest('base64');
        if (receivedSignature != expectedSignature || !data.event) {
            console.error("Invalid Webhook Signature or Event!");
            return;
        }

        // transaction id will be passed from our payment-site as email
        const { email: id, amount } = data;
        let status = null;

        switch (data.event) {
            case "payment.captured":
                status = "SUCCESS";
                break;
            case "payment.failed":
                status = "FAILED";
                break;
        }

        // if webhook is called with none of handled events or transaction id not received
        if (!status || !id) {
            return;
        }

        const payInData = await payInRepo.getPayInData(id);
        if (!payInData) {
            throw Error("Payment does not exist");
        }

        const merchantData = await merchantRepo.getMerchantById(payInData.merchant_id)
        if (!merchantData) {
            console.error("Merchant not found!");
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
        };
        if (status === "SUCCESS") {
            const payinCommission = calculateCommission(amount, merchantData.payin_commission);
            payload.payin_commission = payinCommission;
        }


        const updatePayInDataRes = await payInRepo.updatePayInData(id, payload);
        if (payInData.bank_acc_id) {
            await bankAccountRepo.updateBankAccountBalance(payInData.bank_acc_id, parseFloat(amount));
        }

        await merchantRepo.updateMerchant(payInData.merchant_id, amount)
        const notifyData = {
            status,
            merchantOrderId: updatePayInDataRes?.merchant_order_id,
            payinId: updatePayInDataRes?.id,
            amount: updatePayInDataRes?.confirmed,
            utr_id: updatePayInDataRes?.utr
        };
        await axios.post(payInData.notify_url, notifyData)
    } catch (err) {
        console.error("Razorpay webhook error", err);
    }
});

export { razorHook };