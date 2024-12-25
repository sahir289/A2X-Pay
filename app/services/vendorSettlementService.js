import { prisma } from "../client/prisma.js";
import { logger } from "../utils/logger.js";
class VendorSettlement {

    async createSettlement(body) {
        try {
            const settlement = await prisma.vendorSettlement.create({
                data: body,
            });
            return settlement;
        } catch (error) {
            logger.info('Error creating settlement:', error.message);
        }
    }

    async getSettlement(skip = 0, take = 10, id, code, status, amount, acc_no, method, refrence_id) {
        try {
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
                const SplitedCode = code?.split(",");
                where.Vendor = { vendor_code: Array.isArray(SplitedCode) ? { in: SplitedCode } : code };
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
        } catch (error) {
            logger.info('Error fetching settlements:', error.message);
        }
    }

    async updateSettlement(id, body) {
        try {
            const settlement = await prisma.vendorSettlement.update({
                where: {
                    id: Number(id), // Ensure the ID is treated as a number
                },
                data: body,
            });
            return settlement;
        } catch (error) {
            logger.info('Error updating settlement:', error.message);
        }
    }
}

export default new VendorSettlement();