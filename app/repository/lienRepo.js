import { prisma } from "../client/prisma.js";
import { CustomError } from "../middlewares/errorHandler.js";

class LienRepo {
    async createLien(data) {
        const lien = await prisma.lien.create({
            data: data,
        });
        return lien;
    }

    async getLien(
        skip,
        take,
        sno,
        amount,
        merchant_order_id,
        merchantCode,
        user_id,
    ) {

        const SplitedCode = merchantCode?.split(",");
        const filters = {
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
            lienRes,totalRecords
        };
    }
}

export default new LienRepo();
