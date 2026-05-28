import { Router } from "express";
import {
  acceptInvitation,
  rejectInvitation,
  getMyPendingInvitations
} from "../controllers/invitation.controller.js";
import { verifyToken } from "../middlewares/auth.middleware.js";

export const initInvitationRoutes = (app) => {
  const router = Router();

  // Ver mis invitaciones pendientes (auth required)
  router.get("/pending", verifyToken, getMyPendingInvitations);

  // Aceptar invitación con token
  // POST requiere auth (usuario ya logueado acepta desde la app)
  // GET no requiere auth (usuario llega desde link externo, luego se le pide registrarse)
  router.post("/accept", verifyToken, acceptInvitation);
  router.get("/accept", acceptInvitation);

  // Rechazar invitación (auth required para in-app, o sin auth si llega de link)
  router.post("/:token/reject", verifyToken, rejectInvitation);
  router.get("/:token/reject", rejectInvitation);

  app.use("/api/invitations", router);
};
