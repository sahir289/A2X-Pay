import express from "express";
import botResponseController from "../controller/botResponseController.js";

const botResRouter = express();

botResRouter.post("/create-message", botResponseController.botResponse);

botResRouter.get("/get-message", botResponseController.getBotResponse);

export default botResRouter;
