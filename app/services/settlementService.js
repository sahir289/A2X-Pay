import { prisma } from "../client/prisma.js";
class Settlement {

    async createSettlement(body) {
        return await prisma.settlement.create({
            data: body,
        })
    }

    async getSettlement(skip, take, id, code, status, amount, acc_no, method, refrence_id) {

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
            })

        if (code) {
            where.Merchant = { code };
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
        })
        const totalRecords = await prisma.settlement.count({
            where,
            skip,
            take,
        })

        return {
            data,
            totalRecords,
        }
    }

    async updateSettlement(id, body) {
        return await prisma.settlement.update({
            where: {
                id: Number(id),
            },
            data: body
        })
    }
}

export default new Settlement();