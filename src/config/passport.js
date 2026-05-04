import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import bcrypt from "bcryptjs";
import User from "../models/User.js";

// Estrategia Local: login con email y contraseña
passport.use(
  new LocalStrategy(
    { usernameField: "email" },
    async (email, password, done) => {
      try {
        const user = await User.findOne({ email });
        if (!user) {
          return done(null, false, { message: "Usuario no encontrado" });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
          return done(null, false, { message: "Contraseña incorrecta" });
        }

        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }
  )
);

// Serialización: guardar el ID del usuario en la sesión
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialización: recuperar el usuario desde la base por ID
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err);
  }
});

export default passport;