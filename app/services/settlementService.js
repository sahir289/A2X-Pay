import { prisma } from "../client/prisma.js";
import merchantRepo from "../repository/merchantRepo.js";
import { logger } from "../utils/logger.js";
class Settlement {

    async createSettlement(body) {
        try {
            const settlement = await prisma.settlement.create({
                data: body,
            });
            return settlement;
        } catch (error) {
            logger.info('Error creating settlement:', error.message);
        }
    }

    async getSettlement(skip, take, id, code, status, amount, acc_no, method, refrence_id, includeSubMerchant) {
        try {
            const where = {};
            [
                { col: "id", value: id },
                { col: "status", value: status },
                { col: "amount", value: amount },
                { col: "acc_no", value: acc_no },
                { col: "method", value: method },
                { col: "refrence_id", value: refrence_id },
            ]
                .forEach(el => {
                    if (el.value) {
                        where[el.col] = el.value;
                    }
                });
    
            if (code) {
                const result = code.split(",").map(item => item.trim());
                let allNewMerchantCodes = [];
                if (includeSubMerchant === 'false') {
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
                    where.Merchant = { code: Array.isArray(allNewMerchantCodes) ? { in: allNewMerchantCodes } : code };
                }
                else {
                    const SplitedCode = code?.split(",");
                    where.Merchant = { code: Array.isArray(SplitedCode) ? { in: SplitedCode } : code };
                }
            }
    
            const data = await prisma.settlement.findMany({
                where,
                skip,
                take,
                orderBy: {
                    id: "desc",
                },
                include: {
                    Merchant: {
                        select: {
                            id: true,
                            code: true,
                        }
                    }
                }
            });
    
            const totalRecords = await prisma.settlement.count({
                where,
            });
    
            return {
                data,
                totalRecords,
            };
        } catch (error) {
            logger.info('Error fetching settlements:', error.message);
        }
    }

    async updateSettlement(id, body) {
        try {
            const settlement = await prisma.settlement.update({
                where: {
                    id: Number(id),
                },
                data: body,
            });
            return settlement;
        } catch (error) {
            logger.info('Error updating settlement:', error.message);
        }
    }
}

export default new Settlement();