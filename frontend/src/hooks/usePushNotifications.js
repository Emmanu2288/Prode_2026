import { useEffect, useState } from "react";
import api from "../services/api";
import useAuthStore from "../store/authStore";

const urlBase64ToUint8Array = (base64String) => {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
};

export const subscribeToPush = async () => {
  try {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return false;
    const reg = await navigator.serviceWorker.ready;
    const { data } = await api.get("/push/vapid-key");
    const applicationServerKey = urlBase64ToUint8Array(data.publicKey);
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return false;
    const subscription = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey });
    await api.post("/push/subscribe", subscription.toJSON());
    return true;
  } catch (err) {
    console.warn("Push subscription error:", err.message);
    return false;
  }
};

const usePushNotifications = () => {
  const token = useAuthStore((s) => s.token);
  const [bannerVisible, setBannerVisible] = useState(false);

  useEffect(() => {
    if (!token) return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    if (Notification.permission === "granted") {
      subscribeToPush().catch(() => {});
      return;
    }
    if (Notification.permission === "denied") return;
    // Permiso no decidido → mostrar banner después de 2s
    const timer = setTimeout(() => setBannerVisible(true), 2000);
    return () => clearTimeout(timer);
  }, [token]);

  return { bannerVisible, setBannerVisible };
};

export default usePushNotifications;
