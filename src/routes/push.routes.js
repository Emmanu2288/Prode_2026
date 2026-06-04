import { Router } from "express";
import { verifyToken } from "../middlewares/auth.middleware.js";
import PushSubscription from "../models/PushSubscription.js";

export const initPushRoutes = (app) => {
  const router = Router();

  // Guardar suscripción push del usuario
  router.post("/subscribe", verifyToken, async (req, res) => {
    try {
      const { endpoint, keys } = req.body;
      if (!endpoint || !keys?.p256dh || !keys?.auth) {
        return res.status(400).json({ message: "Suscripción inválida" });
      }
      await PushSubscription.findOneAndUpdate(
        { endpoint },
        { user: req.user.id, endpoint, keys },
        { upsert: true, new: true }
      );
      return res.json({ message: "Suscripción guardada" });
    } catch (err) {
      return res.status(500).json({ message: "Error al guardar suscripción" });
    }
  });

  // Eliminar suscripción
  router.post("/unsubscribe", verifyToken, async (req, res) => {
    try {
      await PushSubscription.deleteOne({ endpoint: req.body.endpoint });
      return res.json({ message: "Suscripción eliminada" });
    } catch (err) {
      return res.status(500).json({ message: "Error al eliminar suscripción" });
    }
  });

  // Devolver la VAPID public key al frontend
  router.get("/vapid-key", (req, res) => {
    res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
  });

  app.use("/api/push", router);
};
