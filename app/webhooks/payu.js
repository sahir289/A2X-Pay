import payInRepo from '../repository/payInRepo.js';
import { calculateCommission } from '../helper/utils.js';
import merchantRepo from '../repository/merchantRepo.js';
import axios from 'axios';
import bankAccountRepo from '../repository/bankAccountRepo.js';
import { logger } from '../utils/logger.js';
import config from '../../config.js';
import crypto from 'crypto';

const payu_key = config.payu_key
const payu_salt = config.payu_salt


const PayUHook = async (req, res) => {
    res.json({status: 200, message: 'PayU Webhook Called successfully'});
    try {

        const data = req.body;
        const { txnid, amount, productinfo, firstname, email, status, hash, bank_ref_num} = data;

        // Recalculate the hash to verify authenticity
        const hashString = `${payu_salt}|${status}|||||||||||${email}|${firstname}|${productinfo}|${amount}|${txnid}|${payu_key}`;
        const calculatedHash = crypto.createHash('sha512').update(hashString).digest('hex');

        console.log(calculatedHash, "calculatedHash", hash, "hash");

        if (calculatedHash !== hash) {
            logger.info("Invalid Hash: Possible Fraud Attempt");
        }

        const payInData = await payInRepo.getPayInData(txnid, true);
        if (!payInData) {
            logger.error("Payment does not exist");
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
            utr: bank_ref_num,
            user_submitted_utr: bank_ref_num,
            method: 'PayU',
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
        logger.error("PayU webhook error", err);
    }
};

const verifyPayUTransaction = async () => {

}

export { payu_key, payu_salt, PayUHook, verifyPayUTransaction}