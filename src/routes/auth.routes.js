import { Router } from "express";
import { registerUser , loginUser } from "../controllers/auth.controller.js";
import passport from "../config/passport.js";

const router = Router();

//Ruta de registro
router.post("/register", registerUser);
router.post("/login", loginUser);

// Login con Passport Local Strategy
router.post(
  "/passport-login",
  passport.authenticate("local", { failureRedirect: "/api/auth/fail" }),
  (req, res) => {
    // Si llega acá, Passport validó usuario y contraseña
    res.json({ message: "Login exitoso con Passport", user: req.user });
  }
);

// Ruta de fallo en login con Passport
router.get("/fail", (req, res) => {
  res.status(401).json({ message: "Error en login con Passport" });
});

// 🔑 Login con Google OAuth
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

// Callback de Google OAuth
router.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: "/api/auth/fail" }),
  (req, res) => {
    res.json({ message: "Login exitoso con Google", user: req.user });
  }
);

export default router;