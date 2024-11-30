import { DefaultResponse } from "../helper/customResponse.js";
import reportRepo from "../repository/reportRepo.js";

class weeklyReportController {
    async getWeeklyReport(req, res, next) {
        try {
            let { merchantCode, startDate, endDate } = req.query;
            if (merchantCode == null) {
                merchantCode = [];
            } else if (typeof merchantCode === "string") {
                merchantCode = [merchantCode];
            }

            const weeklyReport = await reportRepo.getReport(
                merchantCode,
                startDate,
                endDate
            );
            function convertBigIntToString(obj) {
                return JSON.parse(
                    JSON.stringify(obj, (key, value) =>
                        typeof value === "bigint" ? value.toString() : value
                    )
                );
            }
            
            // Example
            DefaultResponse(res, 201, "Weekly Report fetched successfully!", convertBigIntToString(weeklyReport));
            
        } catch (err) {
            console.log(err);
        }
    }
}

export default new weeklyReportController()