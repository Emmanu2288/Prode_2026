import { Router } from "express";
import { getMatches, getFixturePlayers, getHeadToHead, getFixtureEvents, getStandings, getGoldenBoyCandidates } from "../controllers/match.controller.js";
import { verifyToken } from "../middlewares/auth.middleware.js";

export const initMatchRoutes = (app) => {
  const router = Router();

  router.get("/", getMatches);
  router.get("/standings", verifyToken, getStandings);
  router.get("/golden-boy-candidates", verifyToken, getGoldenBoyCandidates);
  router.get("/h2h", verifyToken, getHeadToHead);
  router.get("/:fixtureId/players", verifyToken, getFixturePlayers);
  router.get("/:fixtureId/events", verifyToken, getFixtureEvents);

  app.use("/api/matches", router);
};
