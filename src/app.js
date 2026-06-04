import dotenv from 'dotenv';
dotenv.config();
import { initMonitoring, captureException, slackAlert } from "./utils/alerts.js";
initMonitoring();

import express from 'express';
import cors from 'cors';
import http from 'http';
import { Server as IOServer } from 'socket.io';
import cookieParser from 'cookie-parser';
import passport from './config/passport.js';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import connectDB from './config/db.js';

// Importamos inicializadores de rutas
import { initMatchRoutes } from './routes/match.routes.js';
import { initPredictionRoutes } from './routes/prediction.routes.js';
import { initAuthRoutes } from './routes/auth.routes.js';
import { initUserRoutes } from './routes/user.routes.js';
import { initGroupRoutes } from "./routes/group.routes.js";
import { initInvitationRoutes } from "./routes/invitation.routes.js";
import { initWebhookRoutes } from "./routes/webhook.routes.js";
import { initAdminRoutes } from "./routes/admin.routes.js";
import { initPaymentRoutes } from "./routes/payment.routes.js";
import { initPushRoutes } from "./routes/push.routes.js";

// Importamos cron jobs
import { scheduleMatchStatusCheck } from './services/cron.service.js';

const start = async () => {
  try {
    // Inicializamos DB
    await connectDB();

    const app = express();

    // CORS — permite peticiones desde el frontend
    const allowedOrigins = [
      process.env.FRONTEND_URL || "http://localhost:5173",
      "http://localhost:5173",
      "http://localhost:3000",
    ].filter(Boolean);

    app.use(cors({
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
        return callback(new Error(`CORS bloqueado para: ${origin}`));
      },
      credentials: true,
    }));

    // Guardar raw body para verificación HMAC en webhooks
    app.use(express.json({
      verify: (req, res, buf) => {
        req.rawBody = buf;
      }
    }));
    app.use(express.urlencoded({ extended: true }));
    app.use(cookieParser(process.env.COOKIE_SECRET));

    // Configuración de sesiones (persistidas en MongoDB con connect-mongo)
    app.use(session({
      secret: process.env.SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      store: MongoStore.create({
        mongoUrl: process.env.MONGO_URI,
        collectionName: 'sessions',
        ttl: 60 * 60 // 1 hora en segundos
      }),
      cookie: {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 1000 * 60 * 60 // 1 hora en ms
      }
    }));

    // Configuración de Passport
    app.use(passport.initialize());
    app.use(passport.session());

    // Inicializamos rutas normales
    initMatchRoutes(app);
    initPredictionRoutes(app);
    initAuthRoutes(app);
    initUserRoutes(app);
    initGroupRoutes(app);
    initInvitationRoutes(app);

    // Inicializar rutas de webhook (usa req.rawBody para HMAC)
    initWebhookRoutes(app);
    initAdminRoutes(app);
    initPaymentRoutes(app);
    initPushRoutes(app);

    // Crear servidor HTTP y Socket.IO
    const server = http.createServer(app);
    const io = new IOServer(server, {
      cors: { origin: process.env.FRONTEND_URL || "http://localhost:3000", methods: ["GET","POST"] }
    });

    // Hacer io accesible globalmente para los procesadores
    globalThis.io = io;

    io.on("connection", (socket) => {
      console.log("Socket conectado:", socket.id);

      // Sala personal del usuario para recibir notificaciones (invitaciones, etc.)
      socket.on("join_user", ({ userId }) => {
        if (userId) socket.join(`user_${userId}`);
      });

      // Sala de partido para recibir eventos en vivo
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
    try {
      captureException(err);
      const shortMsg = `Startup failed: ${err.message?.slice(0, 200) || "unknown error"}`;
      slackAlert(shortMsg).catch(() => {});
    } catch (e) {
      console.error("Error reporting startup failure:", e);
    }
    process.exit(1);
  }
};

start();