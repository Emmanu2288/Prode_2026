import { Router } from "express";
import { createGroup, inviteToGroup, getGroupMembers } from "../controllers/group.controller.js";
import { verifyToken } from "../middlewares/auth.middleware.js";

export const initGroupRoutes = (app) => {
  const router = Router();

  // Crear grupo (auth required)
  router.post("/", verifyToken, createGroup);

  // Invitar a un grupo (auth required)
  router.post("/:groupId/invite", verifyToken, inviteToGroup);

  // Listar miembros de un grupo (auth required)
  router.get("/:groupId/members", verifyToken, getGroupMembers);

  app.use("/api/groups", router);
};