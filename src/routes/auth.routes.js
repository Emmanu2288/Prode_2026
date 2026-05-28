import { Router } from "express";
import { registerUser, loginUser, logoutUser, getProfile, getSession } from "../controllers/auth.controller.js";
import { verifyToken } from "../middlewares/auth.middleware.js";
import passport from "../config/passport.js";

export const initAuthRoutes = (app) => {
  const router = Router();

  router.post("/register", registerUser);
  router.post("/login", loginUser);
  router.post("/logout", logoutUser);
  router.get("/profile", verifyToken, getProfile);
  router.get("/session", verifyToken, getSession);

  router.post(
    "/passport-login",
    passport.authenticate("local", { failureRedirect: "/api/auth/fail" }),
    (req, res) => {
      res.json({ message: "Login exitoso con Passport", user: req.user });
    }
  );

  router.get("/fail", (req, res) => {
    res.status(401).json({ message: "Error en login con Passport" });
  });

  router.get("/google", passport.authenticate("google", { scope: ["profile", "email"] }));

  router.get(
    "/google/callback",
    passport.authenticate("google", { failureRedirect: "/api/auth/fail" }),
    (req, res) => {
      res.json({ message: "Login exitoso con Google", user: req.user });
    }
  );

  app.use("/api/auth", router);
};