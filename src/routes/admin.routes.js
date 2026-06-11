import { Router } from "express";
import { verifyToken } from "../middlewares/auth.middleware.js";
import { roleMiddleware } from "../middlewares/role.middleware.js";
import {
  getAdminUsers,
  getAdminGroups,
  getTournamentData,
  processTournamentAwards,
  getFinishedMatches,
  setManualMvp,
  sendAnnouncement,
} from "../controllers/admin.controller.js";
import { adminGenerateResetLink } from "../controllers/auth.controller.js";

export const initAdminRoutes = (app) => {
  const router = Router();
  const admin = [verifyToken, roleMiddleware(["admin"])];

  router.get("/users",               ...admin, getAdminUsers);
  router.get("/groups",              ...admin, getAdminGroups);
  router.get("/tournament-data",     ...admin, getTournamentData);
  router.post("/tournament-awards",  ...admin, processTournamentAwards);
  router.get("/finished-matches",    ...admin, getFinishedMatches);
  router.post("/mvp/:fixtureId",     ...admin, setManualMvp);
  router.post("/users/:userId/reset-link", ...admin, adminGenerateResetLink);
  router.post("/announce",                 ...admin, sendAnnouncement);

  app.use("/api/admin", router);
};
