import { Router } from "express";
import { createPrediction, updateExtras, getUserPredictions } from "../controllers/prediction.controller.js";

export const initPredictionRoutes = (app) => {
  const router = Router();

  router.post("/", createPrediction);
  router.post("/extras", updateExtras);
  router.get("/user/:userId", getUserPredictions);

  app.use("/api/predictions", router);
};
