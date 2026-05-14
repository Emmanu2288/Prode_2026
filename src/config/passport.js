import dotenv from "dotenv";
dotenv.config();

import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import User from "../models/User.js";

// Estrategia Local: login con email y contraseña
passport.use(
  new LocalStrategy(
    { usernameField: "email" },
    async (email, password, done) => {
      try {
        const user = await User.findOne({ email: email.toLowerCase().trim() });
        if (!user) {
          return done(null, false, { message: "Usuario no encontrado" });
        }

        // Si el usuario no tiene password (registro OAuth), denegar con mensaje claro
        if (!user.password) {
          return done(null, false, { message: "Cuenta registrada con OAuth. Usá el login social." });
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
          return done(null, false, { message: "Contraseña incorrecta" });
        }

        return done(null, user);
      } catch (err) {
        console.error("LocalStrategy error:", err);
        return done(err);
      }
    }
  )
);

// Estrategia Google OAuth
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL || "/api/auth/google/callback"
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value?.toLowerCase();
        // 1) Buscar por googleId
        let user = await User.findOne({ googleId: profile.id });

        // 2) Si no existe por googleId, buscar por email para vincular cuentas
        if (!user && email) {
          user = await User.findOne({ email });
          if (user) {
            // Vincular cuenta local existente con googleId
            user.googleId = profile.id;
            await user.save();
            return done(null, user);
          }
        }

        // 3) Si no existe por ninguno, crear nuevo usuario
        if (!user) {
          user = new User({
            first_name: profile.name?.givenName || "",
            last_name: profile.name?.familyName || "",
            email: email || undefined,
            googleId: profile.id,
            role: "user"
          });
          await user.save();
        }

        return done(null, user);
      } catch (err) {
        console.error("GoogleStrategy error:", err);
        return done(err, null);
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
    const user = await User.findById(id).select("-password");
    done(null, user);
  } catch (err) {
    done(err);
  }
});

export default passport;