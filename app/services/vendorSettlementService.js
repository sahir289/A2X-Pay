import { prisma } from "../client/prisma.js";
class VendorSettlement {

    async createSettlement(body) {
        return await prisma.vendorSettlement.create({
            data: body,
        })
    }

    async getSettlement(skip = 0, take = 10, id, code, status, amount, acc_no, method, refrence_id) {
        // Construct the `where` filter object
        const where = {};

        // Add filter conditions if values are provided
        [
            { col: 'id', value: id },
            { col: 'status', value: status },
            { col: 'amount', value: amount },
            { col: 'acc_no', value: acc_no },
            { col: 'method', value: method },
            { col: 'refrence_id', value: refrence_id },
        ].forEach(el => {
            if (el.value) {
                where[el.col] = el.value;
            }
        });

        // Check for the `code` and add Vendor filtering if provided
        if (code) {
            where.Vendor = { vendor_code: code };
        }

        // Fetch the settlements based on the where conditions
        const data = await prisma.vendorSettlement.findMany({
            where,
            skip,
            take,
            orderBy: {
                id: 'desc',
            },
            include: {
                Vendor: {
                    select: {
                        id: true,
                        vendor_code: true,
                    },
                },
            },
        });

        // Count the total records matching the filters
        const totalRecords = await prisma.vendorSettlement.count({
            where,
        });

        // Return the data and total record count
        return {
            data,
            totalRecords,
        };
    }


    async updateSettlement(id, body) {
        return await prisma.vendorSettlement.update({
            where: {
                id: Number(id),
            },
            data: body
        })
    }
}

export default new VendorSettlement();