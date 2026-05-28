import { Router } from "express";
import { createMvpPrediction, getUserMvpPredictions } from "../controllers/mvpPrediction.controller.js";
import { verifyToken } from "../middlewares/auth.middleware.js";

export const initMvpRoutes = (app) => {
  const router = Router();

  router.post("/", verifyToken, createMvpPrediction);

  router.get("/user/:userId", verifyToken, getUserMvpPredictions);

  app.use("/api/mvp", router);
};
