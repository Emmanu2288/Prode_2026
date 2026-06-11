import { Router } from "express";
import { createGroup, inviteToGroup, getGroupMembers, getMyGroups, getGroupById, getGroupPredictions, deleteGroup, updateGroup } from "../controllers/group.controller.js";
import { getGroupLeaderboard } from "../controllers/groupPoints.controller.js";
import { verifyToken } from "../middlewares/auth.middleware.js";
import { roleMiddleware } from "../middlewares/role.middleware.js";

export const initGroupRoutes = (app) => {
  const router = Router();

  // Mis grupos (grupos donde soy miembro)
  router.get("/my", verifyToken, getMyGroups);

  // Crear grupo (solo admin)
  router.post("/", verifyToken, roleMiddleware(["admin"]), createGroup);

  // Detalle de un grupo
  router.get("/:groupId", verifyToken, getGroupById);

  // Actualizar configuración del grupo (solo admin) — ej: monto por pago
  router.patch("/:groupId", verifyToken, roleMiddleware(["admin"]), updateGroup);

  // Invitar a un grupo
  router.post("/:groupId/invite", verifyToken, inviteToGroup);

  // Listar miembros de un grupo
  router.get("/:groupId/members", verifyToken, getGroupMembers);

  // Leaderboard del grupo
  router.get("/:groupId/leaderboard", verifyToken, getGroupLeaderboard);

  // Predicciones de todos los miembros del grupo, agrupadas por partido
  router.get("/:groupId/predictions", verifyToken, getGroupPredictions);

  // Eliminar grupo (solo owner)
  router.delete("/:groupId", verifyToken, deleteGroup);

  app.use("/api/groups", router);
};