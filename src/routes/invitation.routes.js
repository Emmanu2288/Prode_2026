import { Router } from "express";
import { acceptInvitation, rejectInvitation } from "../controllers/invitation.controller.js";
import { verifyToken } from "../middlewares/auth.middleware.js";

export const initInvitationRoutes = (app) => {
  const router = Router();

  // Aceptar invitación (POST para API, GET también soportado en controller)
  router.post("/accept", verifyToken, acceptInvitation);
  router.get("/accept", acceptInvitation);

  // Rechazar invitación por token
  router.post("/:token/reject", verifyToken, rejectInvitation);

  app.use("/api/invitations", router);
};