import { prisma } from "../client/prisma.js";
import { CustomError } from "../middlewares/errorHandler.js";
import { logger } from "../utils/logger.js";

class VendorRepo {
  async createVendor(data) {
    try {
      const vendor = await prisma.vendor.create({
        data: data
      });
      return vendor;
    } catch (error) {
      logger.info('Error creating vendor:', error.message);
    }
  }

  async getAllVendors(id, vendor_code) {
    try {
      const filters = {
        ...(id && { id: { equals: id } }),
        ...(vendor_code && { vendor_code: { equals: vendor_code } }),
      };

      const vendors = await prisma.vendor.findMany({
        where: filters,
        orderBy: {
          id: "desc"
        }
      });

      return vendors;
    } catch (error) {
      logger.info('Error fetching vendors:', error.message);
    }
  }
  async getVendorByCode(code) {
    try {
      const vendor = await prisma.vendor.findFirst({
        where: {
          vendor_code: code
        }
      });

      return vendor;
    } catch (error) {
      logger.info('Error fetching vendor by code:', error.message);
    }
  }
}

export default new VendorRepo();
