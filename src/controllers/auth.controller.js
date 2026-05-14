import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import Invitation from "../models/Invitation.js";
import Membership from "../models/Membership.js";

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

    // Hashear contraseña 
    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(password, salt);

    const newUser = new User({
      first_name,
      last_name,
      email: normalizedEmail,
      password: hashed
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
    res.cookie("token", token, {
      httpOnly: true,
      sameSite: "Strict",
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