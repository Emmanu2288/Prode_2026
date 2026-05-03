import express from 'express';
import cookieParser from 'cookie-parser';
import passport from 'passport';
import session from 'express-session';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

// Middleware basicos
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser(process.env.COOKIE_SECRET));

// Configuracion de sesiones
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'strict'
  }
}));

// Configuracion de Passport
app.use(passport.initialize());
app.use(passport.session());

// Rutas
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);

// Servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});