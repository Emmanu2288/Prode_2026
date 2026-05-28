import { Router } from "express";
import { listUsers, updateUser, deleteUser } from "../controllers/user.controller.js";
import { verifyToken } from "../middlewares/auth.middleware.js";
import { roleMiddleware } from "../middlewares/role.middleware.js";

export const initUserRoutes = (app) => {
  const router = Router();

  // Ruta exclusiva de admin (demuestra 401/403)
  router.get("/admin", verifyToken, roleMiddleware(["admin"]), (req, res) => {
    res.json({ message: "Panel de administración", admin: req.user });
  });

  // Listar todos los usuarios (administradores solamente)
  router.get("/", verifyToken, roleMiddleware(["admin"]), listUsers);

  // Actualizar usuario (propio o admin)
  router.put("/:id", verifyToken, updateUser);

  // Eliminar usuario (solo admin)
  router.delete("/:id", verifyToken, roleMiddleware(["admin"]), deleteUser);

  app.use("/api/users", router);
};
