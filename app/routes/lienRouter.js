import express from 'express';
import lienController from '../controller/lienController.js';

const lienRouter = express()

lienRouter.post('/create-lien',  lienController.createLien)
lienRouter.get('/get-lien',  lienController.getLienResponse) // Password verification while edit and delete functionality

export default lienRouter;