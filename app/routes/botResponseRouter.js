import express from 'express';
import botResponseController from '../controller/botResponseController.js';


const botResRouter = express()

botResRouter.post('/get-message', botResponseController.botResponse)







export default botResRouter;