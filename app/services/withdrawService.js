import { v4 as uuidv4 } from "uuid";
import { prisma } from "../client/prisma.js";
class Withdraw {

    async createWithdraw(body) {
        const id = uuidv4();
        return await prisma.payout.create({
            data: {
                ...body,
                merchant_order_id: id,
            },
        })
    }

    async getWithdraw(skip, take, id, code, status, amount, acc_no) {

        const where = {};
        [
            { col: "id", value: id },
            { col: "status", value: status },
            { col: "amount", value: amount },
            { col: "acc_no", value: acc_no },
        ]
            .forEach(el => {
                if (el.value) {
                    where[el.col] = el.value;
                }
            })

        if (code) {
            where.Merchant = { code };
        }

        const data = await prisma.payout.findMany({
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
        const totalRecords = await prisma.payout.count({
            where,
            skip,
            take,
        })

        return {
            data,
            totalRecords,
        }
    }

    async updateWithdraw(id, body) {
        return await prisma.payout.update({
            where: {
                id: Number(id),
            },
            data: body
        })
    }
}

export default new Withdraw();