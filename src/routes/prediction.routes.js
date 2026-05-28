import { Router } from "express";
import { createPrediction, updateExtras, getUserPredictions } from "../controllers/prediction.controller.js";
import { verifyToken } from "../middlewares/auth.middleware.js";

export const initPredictionRoutes = (app) => {
  const router = Router();

  router.post("/", verifyToken, createPrediction);
  router.post("/extras", verifyToken, updateExtras);
  router.get("/user/:userId", verifyToken, getUserPredictions);

  app.use("/api/predictions", router);
};
