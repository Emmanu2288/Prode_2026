import { Router } from "express";
import { getMatches, getFixturePlayers } from "../controllers/match.controller.js";
import { verifyToken } from "../middlewares/auth.middleware.js";

export const initMatchRoutes = (app) => {
  const router = Router();

  router.get("/", getMatches);
  router.get("/:fixtureId/players", verifyToken, getFixturePlayers);

  app.use("/api/matches", router);
};
