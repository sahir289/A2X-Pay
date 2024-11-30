import express from 'express';
import weeklyReportController from '../controller/weeklyReportController.js';

const weeklyReportRouter = express()

weeklyReportRouter.get('/weekly-report', weeklyReportController.getWeeklyReport )

export default weeklyReportRouter;