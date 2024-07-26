import express from 'express';
import { customError, notFound } from '../middlewares/errorHandler.js';
import loginRouter from './loginRoute.js';
import userRouter from './userRoute.js';
import merchantRouter from './merchatRoutes.js';
import bankAccountRouter from './bankAccountRoute.js';
import payInRouter from './payinRouter.js';
import botResRouter from './botResponseRouter.js';

const router = express();

router.use('/v1',userRouter)
router.use('/v1',loginRouter)
router.use('/v1',merchantRouter)
router.use('/v1',bankAccountRouter)
router.use('/v1',payInRouter)
router.use('/v1',botResRouter)







// Middleware for handling 404 errors
router.use(notFound);
    
// Register the custom error handling middleware after all routes
router.use(customError);

export default router;