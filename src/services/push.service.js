import webpush from "web-push";
import PushSubscription from "../models/PushSubscription.js";

webpush.setVapidDetails(
  "mailto:emma.229288@gmail.com",
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

/**
 * Envía una notificación push a todos los suscriptores (o a un usuario específico)
 */
export const sendPushToAll = async ({ title, body, url = "/" }) => {
  const subscriptions = await PushSubscription.find().lean();
  const payload = JSON.stringify({ title, body, url });

  const results = await Promise.allSettled(
    subscriptions.map((sub) =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: sub.keys },
        payload
      ).catch(async (err) => {
        // Suscripción inválida o expirada → eliminar
        if (err.statusCode === 410 || err.statusCode === 404) {
          await PushSubscription.deleteOne({ endpoint: sub.endpoint });
        }
      })
    )
  );

  const sent = results.filter((r) => r.status === "fulfilled").length;
  console.log(`Push enviado a ${sent}/${subscriptions.length} suscriptores`);
  return sent;
};

export const sendPushToUser = async (userId, { title, body, url = "/" }) => {
  const subscriptions = await PushSubscription.find({ user: userId }).lean();
  const payload = JSON.stringify({ title, body, url });

  await Promise.allSettled(
    subscriptions.map((sub) =>
      webpush.sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, payload)
    )
  );
};
