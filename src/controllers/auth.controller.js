import User from "../models/User.js";
import jwt from "jsonwebtoken";
import Invitation from "../models/Invitation.js";
import Membership from "../models/Membership.js";

const COOKIE_NAME = "authToken";

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = "1h";

/**
 * Registro con soporte para inviteToken
 * - Normaliza email
 * - Hashea contraseña
 * - Aplica inviteToken (si viene) creando la Membership y marcando la Invitation como accepted
 */
export const registerUser = async (req, res) => {
  try {
    const { first_name, last_name, email, password, inviteToken } = req.body;

    if (!first_name || !last_name || !email || !password) {
      return res.status(400).json({ message: "Todos los campos son obligatorios" });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({ message: "El email ya existe" });
    }

    // El modelo User tiene un pre-save hook que hashea la contraseña automáticamente
    const newUser = new User({
      first_name,
      last_name,
      email: normalizedEmail,
      password
    });

    await newUser.save();

    // Aplicar inviteToken si viene
    if (inviteToken) {
      try {
        const invitation = await Invitation.findOne({ token: inviteToken });
        if (invitation && invitation.status === "pending" && invitation.expiresAt > new Date()) {
          // Exigir coincidencia de email
          if (invitation.email && invitation.email !== normalizedEmail) {
            console.warn("Invite token email mismatch:", invitation.email, normalizedEmail);
          } else {
            try {
              await Membership.create({ group: invitation.group, user: newUser._id });
            } catch (err) {
              if (err && err.code !== 11000) {
                console.error("registerUser membership create error:", err);
              }
            }
            invitation.status = "accepted";
            invitation.invitedUser = newUser._id;
            await invitation.save();
          }
        } else {
          console.warn("inviteToken inválido o expirado al registrar usuario");
        }
      } catch (err) {
        console.error("Error aplicando inviteToken en registro:", err);
      }
    }

    const safeUser = {
      id: newUser._id,
      first_name: newUser.first_name,
      last_name: newUser.last_name,
      email: newUser.email,
      role: newUser.role
    };

    return res.status(201).json({ message: "Usuario registrado exitosamente", user: safeUser });
  } catch (error) {
    console.error("registerUser error:", error);
    return res.status(500).json({ message: "Error al registrar el usuario" });
  }
};

/**
 * Login con JWT
 * - Normaliza email
 * - Usa user.comparePassword para soportar cuentas OAuth sin password
 * - Devuelve cookie httpOnly y token en body
 */
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email y contraseña son obligatorios" });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(401).json({ message: "Credenciales inválidas" });
    }

    // Si el usuario no tiene password (registro OAuth), comparePassword devuelve false
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: "Credenciales inválidas" });
    }

    const payload = { id: user._id, email: user.email, role: user.role };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    // Cookie segura
    res.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 1000 * 60 * 60 // 1 hora
    });

    const safeUser = {
      id: user._id,
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      role: user.role
    };

    return res.json({ message: "Login exitoso", user: safeUser, token });
  } catch (error) {
    console.error("loginUser error:", error);
    return res.status(500).json({ message: "Error en el login" });
  }
};

/**
 * Logout
 * - Destruye la sesión de Passport/express-session
 * - Limpia la cookie authToken
 */
export const logoutUser = (req, res) => {
  req.logout((err) => {
    if (err) console.error("logout error:", err);
    req.session.destroy((destroyErr) => {
      if (destroyErr) console.error("session destroy error:", destroyErr);
      res.clearCookie(COOKIE_NAME);
      return res.json({ message: "Sesión cerrada correctamente" });
    });
  });
};

/**
 * GET /api/auth/profile
 * Devuelve los datos del usuario autenticado (requiere JWT).
 * Útil para que el frontend cargue el perfil sin conocer el userId de antemano.
 */
export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ message: "Usuario no encontrado" });
    return res.json(user);
  } catch (error) {
    console.error("getProfile error:", error);
    return res.status(500).json({ message: "Error al obtener el perfil" });
  }
};

/**
 * GET /api/auth/session
 * Verifica si hay una sesión activa (Passport session o JWT en cookie/header).
 * Útil para que el frontend sepa si el usuario sigue logueado al refrescar la página.
 */
export const getSession = async (req, res) => {
  // Si el middleware verifyToken ya resolvió el usuario (JWT)
  if (req.user && req.user.id) {
    try {
      const user = await User.findById(req.user.id).select("-password");
      return res.json({ authenticated: true, user });
    } catch (err) {
      console.error("getSession error:", err);
      return res.status(500).json({ message: "Error al verificar sesión" });
    }
  }
  return res.status(401).json({ authenticated: false, message: "Sin sesión activa" });
};