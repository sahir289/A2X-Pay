import cron from "node-cron";
import { prisma } from "../client/prisma.js";
import moment from "moment-timezone";
import { logger } from "../utils/logger.js";
import axios from "axios";

cron.schedule("*/10 * * * * *", () => {
    gatherPayinData("Asia/Kolkata");
});

const gatherPayinData = async (timezone = "Asia/Kolkata") => {
    const currentDate = moment().tz(timezone, true);
    try {
        // Fetch payins from the last 10 minutes
        const startDate = currentDate.clone().subtract(10, "minutes").toDate();
        const payins = await prisma.payin.findMany({
            where: {
                updatedAt: { gte: startDate },
                status: "DROPPED",
                is_notified: false,
                // notify_url: { not: null },
            },
            select: {
                id: true,
                amount: true,
                notify_url: true,
                merchant_order_id: true,
            },
        });
        await notifyDroppedPayins(payins);
        logger.info("Cron job gatherPayinData running successfully.", startDate);
    } catch (error) {
        console.log(error)
        logger.error("Error in gatherPayinData:", error?.message);
    }
};

async function notifyDroppedPayins(payins) {
    for (const payin of payins) {
        const notifyData = {
            status: "DROPPED",
            merchantOrderId: payin.merchant_order_id || null,
            payinId: payin.id || null,
            amount: null,
            req_amount: payin.amount || null,
            utr_id: ""
        };

        try {
            logger.info('Sending notification to merchant', { notify_url: payin.notify_url, notify_data: notifyData });

            if (payin.notify_url) {
                const notifyMerchant = await axios.post(payin.notify_url, notifyData);
                logger.info('Notification sent successfully', {
                    status: notifyMerchant.status,
                    data: notifyMerchant.data,
                });
                await prisma.payin.update({
                    where: { id: payin.id },
                    data: { is_notified: true },
                });
            } else {
                logger.warn('Notify URL is missing for payin', { payinId: payin.id });
            }
        } catch (error) {
            logger.error("Error sending notification:", {
                error: error?.message?.message,
                payinId: payin.id,
                notify_url: payin.notify_url
            });
        }
    }
}

export default gatherPayinData;