import express from 'express';
import userRouter from './userRoute.js';
import { customError, notFound } from '../middlewares/errorHandler.js';
import permissionRouter from './permissionRoute.js';
import rolePermissionRouter from './rolePermissionRoute.js';
import loginRouter from './loginRoute.js';

const router = express();

router.use('/v1',userRouter)
router.use('/v1',permissionRouter)
router.use('/v1',rolePermissionRouter)
router.use('/v1',loginRouter)







// Middleware for handling 404 errors
router.use(notFound);
    
// Register the custom error handling middleware after all routes
router.use(customError);

export default router;