import { Router } from "express";
import { getMatches } from "../controllers/match.controller.js";

export const initMatchRoutes = (app) => {
  const router = Router();

  router.get("/", getMatches);

  app.use("/api/matches", router);
};
