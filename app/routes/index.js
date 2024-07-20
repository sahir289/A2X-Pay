import express from 'express';
import { customError, notFound } from '../middlewares/errorHandler.js';
import loginRouter from './loginRoute.js';
import userRouter from './userRoute.js';

const router = express();

router.use('/v1',userRouter)
router.use('/v1',loginRouter)







// Middleware for handling 404 errors
router.use(notFound);
    
// Register the custom error handling middleware after all routes
router.use(customError);

export default router;