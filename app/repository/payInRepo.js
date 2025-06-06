import { prisma } from '../client/prisma.js';
import { logger } from '../utils/logger.js';

class PayInRepo {

    async generatePayInUrl(data) {
        try {
            const payInUrlRes = await prisma.payin.create({
                data: data
            })
            return payInUrlRes
        } catch (err) {
            logger.info('Error generating PayIn URL:', err.message);
        }
    }

    async validatePayInUrl(payInId) {
        try {
            const validateUrlRes = await prisma.payin.findFirst({
                where: {
                    id: payInId
                },
                include: {
                    Merchant: {
                        select: {
                            code: true
                        }
                    }
                }
            })
            return validateUrlRes
        } catch (err) {
            logger.info('Error validating PayIn URL:', err.message);
        }
    }

    async expirePayInUrl(payInId) {
        try {
            const expirePayInUrlRes = await prisma.payin.update({
                where: {
                    id: payInId
                }, data: {
                    is_url_expires: true,
                    status: "DROPPED"
                }
            })
            return expirePayInUrlRes
        } catch (err) {
            logger.info('Error in expiring PayIn URL:', err.message);
        }
    }

    async getMerchantByCodeAndApiKey(code, api_key) {
        try {
            const merchantRes = await prisma.merchant.findFirst({
                where: {
                    code: code,
                    api_key: api_key
                }
            })

            return merchantRes;
        } catch (err) {
            logger.info('Error fetching merchant data by code and api key:', err.message);
        }
    }

    async getPayInData(payInId, isSno = false) {
        if(!payInId){
            throw new CustomError(401, "PayIn Id is missing");
        }
        try {
            let condition = {
                id: payInId
            };
            if(isSno){
                condition = { sno: Number(payInId) };
            }
            const paymentRes = await prisma.payin.findFirst({
                where: condition,
                include: {
                    Merchant: true
                }
            })
            return paymentRes
        } catch (err) {
            logger.info('Error fetching PayIn data by id:', err.message);
        }
    }

    async updatePayInData(payInId, data, tx) {
        try {
            const client = tx || prisma;
            const payInUrlRes = await client.payin.update({
                where: {
                    id: payInId
                },
                data: data
            })
            return payInUrlRes
        } catch (error) {
            logger.info('Payin data did not updated', error);
            throw error;
        }
    }


    async getPayInDataByUtrOrUpi(utr, upi_short_code) {
        try {
            // Construct the conditions
            let conditions = [];

            // if (utr) {
            //     conditions.push({ user_submitted_utr: utr , });
            // }
            if (utr) {
                conditions.push({
                    user_submitted_utr: utr,
                    status: { not: 'DUPLICATE' }
                });
            }
            if (upi_short_code !== "nil") {
                conditions.push({ upi_short_code: upi_short_code });
            }

            // If no conditions are provided, return an empty array
            if (conditions.length === 0) {
                return [];
            }

            // If both conditions are present, use AND condition
            if (conditions[0]?.user_submitted_utr && conditions[1]?.upi_short_code) {

                // const payInRes = await prisma.payin.findMany({
                //     where: {
                //         AND: [
                //             { user_submitted_utr: utr },
                //             { upi_short_code: upi_short_code }
                //         ],
                //         OR: {
                //             upi_short_code: upi_short_code
                //         }
                //     }
                // });
                // return payInRes;
                const payInRes = await prisma.payin.findMany({
                    where: {
                        AND: [
                            { user_submitted_utr: utr },
                            { upi_short_code: upi_short_code }
                        ]
                    }
                });

                if (!payInRes.length) {
                    // If no result is found, try searching only by upi_short_code
                    const fallbackRes = await prisma.payin.findMany({
                        where: {
                            upi_short_code: upi_short_code,

                        }
                    });
                    return fallbackRes;
                }
                return payInRes;
            } else {
                // If only one condition is present, use OR condition
                const payInRes = await prisma.payin.findMany({
                    where: {
                        OR: conditions
                    },
                });
                return payInRes;
            }
        } catch (err) {
            logger.info('Error fetching PayIn data by UTR or UPI:', err.message);
        }
    }


    async getPayInDataByMerchantOrderId(merchantOrderId) {
        try {
            const payInDataRes = await prisma.payin.findFirst({
                where: {
                    merchant_order_id: merchantOrderId,
                },
                include: {
                    Merchant: true
                }
            })
            return payInDataRes;
        } catch (err) {
            logger.info('Error fetching PayIn data by merchant order id:', err.message);
        }
    }

    async getPayinDataByUsrSubmittedUtr(usrSubmittedUtr) {
        try {
            const payInRes = await prisma.payin.findMany({
                where: {
                    user_submitted_utr: usrSubmittedUtr,
                },
                orderBy: {
                    sno: "desc",
                },
            });
            return payInRes;
        } catch (err) {
            logger.info('Error fetching PayIn data by user submitted UTR:', err.message);
        }
    }

    async getPayinDataByUtr(utr) {
        try {
            const payInRes = await prisma.payin.findMany({
                where: {
                    utr: utr,
                },
                orderBy: {
                    sno: "desc",
                },
            });
            return payInRes;
        } catch (err) {
            logger.info('Error fetching PayIn data by UTR:', err.message);
        }
    }
}

export default new PayInRepo()