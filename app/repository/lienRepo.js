import { prisma } from "../client/prisma.js";
import { CustomError } from "../middlewares/errorHandler.js";
import { logger } from "../utils/logger.js";
import merchantRepo from "./merchantRepo.js";

class LienRepo {
    async createLien(data) {
        try {
            const lien = await prisma.lien.create({
                data: data,
            });
            return lien;
        } catch (error) {
            logger.info('Error creating lien:', error.message);
        }
    }

    async getLienByMerchantOrderID(merchant_order_id) {
        try {
            const lien = await prisma.lien.findFirst({
                where: {
                    merchant_order_id: merchant_order_id,
                },
            });
            return lien;
        } catch (error) {
            logger.info('Error creating lien:', error.message);
        }
    }

    async getLien(
        skip,
        take,
        sno,
        amount,
        merchant_order_id,
        merchantCode,
        user_id,
        includeSubMerchant
    ) {
        try {
            const SplitedCode = merchantCode?.split(",");
            let filters;
            const result = merchantCode?.split(",").map(item => item.trim());
            let allNewMerchantCodes = [];
            if (includeSubMerchant === 'false' && merchantCode?.length > 0) {
                for (const code of result) {
                    const merchantData = await merchantRepo.getMerchantByCode(code);
                    if (merchantData) {
                        allNewMerchantCodes = [
                            ...allNewMerchantCodes,
                            ...(Array.isArray(merchantData.child_code) ? merchantData.child_code : []),
                            merchantData.code,
                        ];
                    }
                }
                filters = {
                    ...(sno && { sno: { equals: sno } }),
                    ...(merchant_order_id && {
                        merchant_order_id: { contains: merchant_order_id, mode: "insensitive" },
                    }),
                    ...(user_id && { user_id: { equals: user_id } }),
                    ...(amount && { amount: { equals: amount } }),
                    ...(merchantCode && {
                        Merchant: {
                            code: Array.isArray(allNewMerchantCodes) ? { in: allNewMerchantCodes } : merchantCode,
                        },
                    }),
                };
            }
            else {
                filters = {
                    ...(sno && { sno: { equals: sno } }),
                    ...(merchant_order_id && {
                        merchant_order_id: { contains: merchant_order_id, mode: "insensitive" },
                    }),
                    ...(user_id && { user_id: { equals: user_id } }),
                    ...(amount && { amount: { equals: amount } }),
                    ...(merchantCode && {
                        Merchant: {
                            code: Array.isArray(SplitedCode) ? { in: SplitedCode } : merchantCode,
                        },
                    }),
                };
            }
    
            const lienRes = await prisma.lien.findMany({
                where: filters,
                skip: skip,
                take: take,
                include: {
                    Merchant: true,
                },
                orderBy: {
                    sno: "desc"
                }
            });
    
            const totalRecords = await prisma.lien.count({ where: filters });
    
            return {
                lienRes, 
                totalRecords
            };
        } catch (error) {
            logger.info('Error fetching liens:', error.message);
        }
    }
}

export default new LienRepo();
