import payInRepo from '../repository/payInRepo.js';
import { calculateCommission } from '../helper/utils.js';
import merchantRepo from '../repository/merchantRepo.js';
import axios from 'axios';
import bankAccountRepo from '../repository/bankAccountRepo.js';
import { logger } from '../utils/logger.js';
import config from '../../config.js';
import crypto from 'crypto';


const A2Pay = async (req, res) => {
    res.json({status: 200, message: 'A2Pay Webhook Called successfully'});
    try {

        const data = req.body;
        const collectionId = config.a2_pay_collection_id;
        const salt = config.a2_pay_Salt;
        
        const { amount, transaction_id, status, hash, order_id } = data.transaction;
        const statusValue = status === 'completed' ? 'SUCCESS' : status === 'dropped' ? 'DROPPED' : 'PENDING';
        // Recalculate the hash to verify authenticity
        const hashString =`${collectionId}|${amount}|${order_id}|${salt}`;
        const calculatedHash = crypto.createHash('sha512').update(hashString).digest('hex');

        if (calculatedHash !== hash) {
            logger.info("Invalid Hash: Possible Fraud Attempt");
        }
        const payInData = await payInRepo.getPayInData(order_id, false);
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
            status : statusValue,
            is_notified: true,
            approved_at: statusValue === 'SUCCESS' ? new Date() : null,
            duration,
            utr: transaction_id,
            user_submitted_utr: transaction_id,
            method: 'A2Pay',
        };

        if (statusValue === "SUCCESS") {
            const payinCommission = calculateCommission(amount, merchantData.payin_commission);
            payload.payin_commission = payinCommission;
        }

        const updatePayInDataRes = await payInRepo.updatePayInData(payInData.id, payload);

        // Calculate pay-in records for the dashboard and today's amount received in bank
        const updatedData = {
            status: `/${status}`,
            amount_code: null,
            amount,
            utr: `${transaction_id}-Intent`,
            is_used: true,
            bankName : updatePayInDataRes?.bank_name
          };
        await botResponseRepo.botResponse(updatedData);


        if (payInData.bank_acc_id) {
            await bankAccountRepo.updateBankAccountBalance(payInData.bank_acc_id, parseFloat(amount));
        }

        await merchantRepo.updateMerchant(payInData.merchant_id, amount);

        const notifyData = {
            status: statusValue,
            merchantOrderId: updatePayInDataRes?.merchant_order_id,
            payinId: updatePayInDataRes?.id,
            amount: updatePayInDataRes?.confirmed,
            utr_id: updatePayInDataRes?.utr
        };

        await axios.post(payInData.notify_url, notifyData).catch((err) => {
            logger.error("Error notifying merchant:", err);
        });
        logger.info('Sending notification to merchant for A2Pay', { notify_url: payInData.notify_url, notify_data: notifyData });

        logger.info("A2Pay Transaction status updated successfully");
    } catch (err) {
        logger.error("A2Pay webhook error", err);
    }
};

export default A2Pay