import { useEffect } from "react";
import api from "../services/api";
import useAuthStore from "../store/authStore";

const urlBase64ToUint8Array = (base64String) => {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
};

const usePushNotifications = () => {
  const token = useAuthStore((s) => s.token);

  useEffect(() => {
    if (!token) return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

    const subscribe = async () => {
      try {
        const reg = await navigator.serviceWorker.ready;

        // Obtener VAPID public key del backend
        const { data } = await api.get("/push/vapid-key");
        const applicationServerKey = urlBase64ToUint8Array(data.publicKey);

        // Verificar si ya está suscrito
        const existing = await reg.pushManager.getSubscription();
        if (existing) {
          await api.post("/push/subscribe", existing.toJSON()).catch(() => {});
          return;
        }

        // Pedir permiso
        const permission = await Notification.requestPermission();
        if (permission !== "granted") return;

        // Crear nueva suscripción
        const subscription = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey,
        });

        await api.post("/push/subscribe", subscription.toJSON());
      } catch (err) {
        console.warn("Push subscription error:", err.message);
      }
    };

    // Esperar un poco para no bloquear la carga inicial
    const timer = setTimeout(subscribe, 3000);
    return () => clearTimeout(timer);
  }, [token]);
};

export default usePushNotifications;
