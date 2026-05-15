import express from "express";
import { footballWebhook } from "../controllers/webhook.controller.js";

export const initWebhookRoutes = (app) => {
  const router = express.Router();

  // Endpoint público que la plataforma de la API llamará
  router.post("/football", footballWebhook);

  app.use("/api/webhooks", router);
};