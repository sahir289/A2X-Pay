import { prisma } from "../client/prisma.js";
import { CustomError } from "../middlewares/errorHandler.js";

class VendorRepo {
  async createVendor(data) {
    const vendor = await prisma.vendor.create({
      data: data,
    });
    return vendor;
  }

  async getAllVendors() {
    const vendors = await prisma.vendor.findMany({
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
