import payInRepo from '../repository/payInRepo.js';
import { calculateCommission } from '../helper/utils.js';
import merchantRepo from '../repository/merchantRepo.js';
import axios from 'axios';
import bankAccountRepo from '../repository/bankAccountRepo.js';
import { logger } from '../utils/logger.js';
import PayU from 'payu-websdk';

const payu_key = "TK0TDL";
const payu_salt = "MfAQ5hetYks7H39yly7UE0fORjUH1Z0g";

const payuClient = new PayU({
    key: payu_key,
    salt: payu_salt,
  },"TEST");     // Possible value  = TEST/LIVE

const PayUHook = async (req, res) => {
    res.json({status: 200, message: 'Payu Webhook Called successfully'});
    try {
        const { amount, email, phone, txnid } = req.body;

    const payuData = {
      key: PAYU_MERCHANT_KEY,
      txnid,
      amount,
      productinfo: "Test Product",
      firstname: "User",
      email,
      phone,
      surl: "https://test.com/success", 
      furl: "https://test.com/failure", 
      service_provider: "payu_paisa",
      payment_method: "upi", 
    };

    // Create hash for PayU payment
    const hashString = `${payuData.key}|${payuData.txnid}|${payuData.amount}|${payuData.productinfo}|${payuData.firstname}|${payuData.email}|||||||||||${PAYU_MERCHANT_SALT}`;
    const hash = crypto.createHash("sha512").update(hashString).digest("hex");

    payuData.hash = hash;

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

const verifyPayUTransaction = async () => {

}

export { payuClient, payu_key, payu_salt, PayUHook, verifyPayUTransaction}