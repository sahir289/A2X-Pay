import express from 'express';
import weeklyReportController from '../controller/weeklyReportController.js';

const weeklyReportRouter = express()

weeklyReportRouter.get('/weekly-report', weeklyReportController.getWeeklyReport )
weeklyReportRouter.get('/weekly-vendor-report', weeklyReportController.getWeeklyVendorReport )

export default weeklyReportRouter;