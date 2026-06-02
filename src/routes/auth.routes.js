import { Router } from "express";
import { registerUser, loginUser, logoutUser, getProfile, getSession, forgotPassword, resetPassword } from "../controllers/auth.controller.js";
import { verifyToken } from "../middlewares/auth.middleware.js";
import passport from "../config/passport.js";
import jwt from "jsonwebtoken";

export const initAuthRoutes = (app) => {
  const router = Router();

  router.post("/register", registerUser);
  router.post("/login", loginUser);
  router.post("/forgot-password", forgotPassword);
  router.post("/reset-password", resetPassword);
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
      // Generar JWT y setear cookie, igual que el login normal
      const payload = { id: req.user._id, email: req.user.email, role: req.user.role };
      const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1h" });

      res.cookie("authToken", token, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 1000 * 60 * 60,
      });

      // Redirigir al frontend con el token en la URL para que lo guarde en localStorage
      const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
      return res.redirect(`${frontendUrl}/auth/callback?token=${token}`);
    }
  );

  app.use("/api/auth", router);
};