import { DefaultResponse } from "../helper/customResponse.js";
import reportRepo from "../repository/reportRepo.js";
import { logger } from "../utils/logger.js";

class weeklyReportController {
    async getWeeklyReport(req, res, next) {
        try {
            let { merchantCode, startDate, endDate, includeSubMerchant } = req.query;
            if (merchantCode == null) {
                merchantCode = [];
            } else if (typeof merchantCode === "string") {
                merchantCode = [merchantCode];
            }

            let localIncludeSubMerchant = false;

            if (includeSubMerchant === 'false') {
                const weeklyReport = await reportRepo.getReport(
                    merchantCode,
                    startDate,
                    endDate,
                    localIncludeSubMerchant
                );

                function convertBigIntToString(obj) {
                    return JSON.parse(
                        JSON.stringify(obj, (key, value) =>
                            typeof value === "bigint" ? value.toString() : value
                        )
                    );
                }

                DefaultResponse(res, 201, "Weekly Report fetched successfully!", convertBigIntToString(weeklyReport));

            } else {
                localIncludeSubMerchant = true;
                const weeklyReport = await reportRepo.getReport(
                    merchantCode,
                    startDate,
                    endDate,
                    localIncludeSubMerchant
                );

                function convertBigIntToString(obj) {
                    return JSON.parse(
                        JSON.stringify(obj, (key, value) =>
                            typeof value === "bigint" ? value.toString() : value
                        )
                    );
                }

                DefaultResponse(res, 201, "Weekly Report fetched successfully!", convertBigIntToString(weeklyReport));
            }

        } catch (err) {
            logger.error(err);
            next(err);
        }
    }

    async getWeeklyVendorReport(req, res, next) {
        try {
            let { vendorCode, startDate, endDate, includeSubMerchant } = req.query;
            if (vendorCode == null) {
                vendorCode = [];
            } else if (typeof vendorCode === "string") {
                vendorCode = [vendorCode];
            }

            const weeklyReport = await reportRepo.getVendorReport(
                vendorCode,
                startDate,
                endDate,
            );

            function convertBigIntToString(obj) {
                return JSON.parse(
                    JSON.stringify(obj, (key, value) =>
                        typeof value === "bigint" ? value.toString() : value
                    )
                );
            }

            DefaultResponse(res, 201, "Weekly Report fetched successfully!", convertBigIntToString(weeklyReport));

        } catch (err) {
            logger.error(err);
            next(err);
        }
    }
}

export default new weeklyReportController()