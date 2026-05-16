import * as Sentry from "@sentry/node";
import fetch from "node-fetch";

export const initMonitoring = (opts = {}) => {
  const dsn = process.env.SENTRY_DSN || "";
  const env = process.env.NODE_ENV || "development";
  Sentry.init({
    dsn,
    environment: env,
    tracesSampleRate: 0.0
  });
};

export const captureException = (err) => {
  try {
    Sentry.captureException(err);
  } catch (e) {
    console.error("Sentry capture failed:", e);
  }
};

export const slackAlert = async (text) => {
  const url = process.env.SLACK_WEBHOOK_URL;
  if (!url) return;
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text })
    });
  } catch (e) {
    console.error("Slack alert failed:", e);
  }
};