import { Router } from "express";
import { listUsers, updateUser, deleteUser } from "../controllers/user.controller.js";
import { verifyToken } from "../middlewares/auth.middleware.js";
import { roleMiddleware } from "../middlewares/role.middleware.js";

export const initUserRoutes = (app) => {
  const router = Router();

  // Listar todos los usuarios (administradores solamente)
  router.get("/", verifyToken, roleMiddleware(["admin"]), listUsers);

  // Actualizar usuario (propio o admin)
  router.put("/:id", verifyToken, updateUser);

  // Eliminar usuario (solo admin)
  router.delete("/:id", verifyToken, roleMiddleware(["admin"]), deleteUser);

  app.use("/api/users", router);
};
