import { DefaultResponse } from "../helper/customResponse.js";
import { checkValidation } from "../helper/validationHelper.js";
import vendorRepo from "../repository/vendorRepo.js";

class VendorController {
  async createVendor(req, res, next) {
    try {
      checkValidation(req);
      const data = req.body;

      const vendorRes = await vendorRepo.createVendor(data);

      return DefaultResponse(
        res,
        201,
        "Vendor Account is created successfully",
        vendorRes
      );
    } catch (error) {
      next(error);
    }
  }

  async getAllVendors(req, res, next) {
    const vendor_code = req.query.vendor_code;
    try {
      const vendors = await vendorRepo.getAllVendors(vendor_code);
      return DefaultResponse(res, 200, "All vendors", vendors);
    } catch (error) {
      next(error);
    }
  }
}

export default new VendorController();
