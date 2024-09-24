import { prisma } from "../client/prisma.js";
import { CustomError } from "../middlewares/errorHandler.js";

class VendorRepo {
  async createVendor(data) {
    const vendor = await prisma.vendor.create({
      data: data,
    });
    return vendor;
  }

  async getAllVendors(vendor_code) {
    const filters = {
      ...(vendor_code && { vendor_code: { equals: vendor_code } }),
    };
    const vendors = await prisma.vendor.findMany({
      where: filters,
      orderBy: {
        id: "desc"
      }
    });
    return vendors;
  }
  async getVendorByCode(code) {
    const vendors = await prisma.vendor.findFirst({
      where: {
        vendor_code: code
      }
    });
    return vendors;
  }
}

export default new VendorRepo();
