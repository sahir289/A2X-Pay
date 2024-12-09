import express from "express";
import botResponseController from "../controller/botResponseController.js";
import isAuthenticated from "../middlewares/authMiddleware.js";

const botResRouter = express();

botResRouter.post("/create-message", botResponseController.botResponse);

botResRouter.get("/get-message", botResponseController.getBotResponse);

botResRouter.get("/get-bank-message", botResponseController.getBotResponseByBank);

botResRouter.put("/reset-message", isAuthenticated, botResponseController.resetResponse);

export default botResRouter;
