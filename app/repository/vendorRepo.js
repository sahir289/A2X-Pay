import { prisma } from "../client/prisma.js";
import { CustomError } from "../middlewares/errorHandler.js";

class VendorRepo {
  async createVendor(data) {
    const vendor = await prisma.vendor.create({
      data: data,
    });
    return vendor;
  }

  async getAllVendors(query) {
    const vendor_code = query.vendor_code;
    const page = parseInt(query.page) || null;
    const pageSize = parseInt(query.pageSize) || null;

    if (!page || !pageSize) {
      const vendors = await prisma.vendor.findMany({
        orderBy: {
          id: "desc",
        },
      });
      return vendors;
    }

    const skip = (page - 1) * pageSize;
    const take = pageSize;

    const filters = {
      ...(vendor_code && { vendor_code: { equals: vendor_code } }),
    };
    const vendors = await prisma.vendor.findMany({
      where: filters,
      skip: skip,
      take: take,
      orderBy: {
        id: "desc",
      },
    });

    const totalRecords = await prisma.vendor.count({
      where: filters,
    });

    return {
      vendors,
      pagination: {
        page: parseInt(page),
        pageSize,
        total: totalRecords,
      },
    };
  }
  async getVendorByCode(code) {
    const vendors = await prisma.vendor.findFirst({
      where: {
        vendor_code: code,
      },
    });
    return vendors;
  }
}

export default new VendorRepo();
