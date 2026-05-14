import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cookieParser from 'cookie-parser';
import passport from './config/passport.js';
import session from 'express-session';
import connectDB from './config/db.js';

// Importamos inicializadores de rutas
import { initMatchRoutes } from './routes/match.routes.js';
import { initPredictionRoutes } from './routes/prediction.routes.js';
import { initMvpRoutes } from './routes/mvpPrediction.routes.js';
import { initAuthRoutes } from './routes/auth.routes.js';
import { initUserRoutes } from './routes/user.routes.js';
import { initGroupRoutes } from "./routes/group.routes.js";
import { initInvitationRoutes } from "./routes/invitation.routes.js";

// Importamos cron jobs
import { scheduleMatchStatusCheck } from './services/cron.service.js';

// Inicializamos DB
connectDB();

// Inicializamos cron jobs
scheduleMatchStatusCheck();

const app = express();

// Middleware básicos
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser(process.env.COOKIE_SECRET));

// Configuración de sesiones
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production'
  }
}));

// Configuración de Passport
app.use(passport.initialize());
app.use(passport.session());

// Inicializamos rutas
initMatchRoutes(app);
initPredictionRoutes(app);
initMvpRoutes(app);
initAuthRoutes(app);
initUserRoutes(app);
initGroupRoutes(app);
initInvitationRoutes(app);

// Servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
