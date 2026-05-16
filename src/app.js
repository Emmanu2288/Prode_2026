import dotenv from 'dotenv';
dotenv.config();
import { initMonitoring } from "./src/utils/alerts.js";
initMonitoring();

import express from 'express';
import http from 'http';
import { Server as IOServer } from 'socket.io';
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
import { initWebhookRoutes } from "./routes/webhook.routes.js";

// Importamos cron jobs
import { scheduleMatchStatusCheck } from './services/cron.service.js';

const start = async () => {
  try {
    // Inicializamos DB
    await connectDB();

    const app = express();

    // Guardar raw body para verificación HMAC en webhooks
    app.use(express.json({
      verify: (req, res, buf) => {
        req.rawBody = buf;
      }
    }));
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

    // Inicializamos rutas normales
    initMatchRoutes(app);
    initPredictionRoutes(app);
    initMvpRoutes(app);
    initAuthRoutes(app);
    initUserRoutes(app);
    initGroupRoutes(app);
    initInvitationRoutes(app);

    // Inicializar rutas de webhook (usa req.rawBody para HMAC)
    initWebhookRoutes(app);

    // Crear servidor HTTP y Socket.IO
    const server = http.createServer(app);
    const io = new IOServer(server, {
      cors: { origin: process.env.FRONTEND_URL || "http://localhost:3000", methods: ["GET","POST"] }
    });

    // Hacer io accesible globalmente para los procesadores
    globalThis.io = io;

    io.on("connection", (socket) => {
      console.log("Socket conectado:", socket.id);
      socket.on("join_match", ({ matchId }) => {
        if (matchId) socket.join(`match_${matchId}`);
      });
      socket.on("leave_match", ({ matchId }) => {
        if (matchId) socket.leave(`match_${matchId}`);
      });
    });

    // Iniciar cron jobs después de que la DB y Socket.IO estén listos
    scheduleMatchStatusCheck();

    // Servidor
    const PORT = process.env.PORT || 3000;
    server.listen(PORT, () => {
      console.log(`Servidor corriendo en http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("Error arrancando la aplicación:", err);
    process.exit(1);
  }
};

start();