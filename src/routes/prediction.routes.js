import { Router } from "express";
import { createPrediction, updatePrediction, updateExtras, getExtras, getUserPredictions, getMyPredictions } from "../controllers/prediction.controller.js";
import { verifyToken } from "../middlewares/auth.middleware.js";

export const initPredictionRoutes = (app) => {
  const router = Router();

  router.post("/", verifyToken, createPrediction);
  router.put("/match/:matchId", verifyToken, updatePrediction);
  router.get("/extras", verifyToken, getExtras);
  router.post("/extras", verifyToken, updateExtras);
  router.get("/me", verifyToken, getMyPredictions);
  router.get("/user/:userId", verifyToken, getUserPredictions);

  app.use("/api/predictions", router);
};
