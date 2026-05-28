// Monitoring stub — Sentry y Slack deshabilitados intencionalmente.
// Se pueden reactivar en el futuro agregando las variables de entorno
// SENTRY_DSN y SLACK_WEBHOOK_URL y restaurando las integraciones.

export const initMonitoring = () => {};

export const captureException = (err) => {
  console.error("[ERROR]", err?.message || err);
};

export const slackAlert = async (text) => {
  console.warn("[ALERT]", text);
};
