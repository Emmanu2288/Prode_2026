import { Router } from "express";
import { createMvpPrediction, getUserMvpPredictions } from "../controllers/mvpPrediction.controller.js";

export const initMvpRoutes = (app) => {
  const router = Router();

  router.post("/", createMvpPrediction);

  router.get("/user/:userId", getUserMvpPredictions);

  app.use("/api/mvp", router);
};
