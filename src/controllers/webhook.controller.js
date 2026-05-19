import crypto from "crypto";
import { processWebhookEvent } from "../services/webhook.processor.js";

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || "";

export const footballWebhook = async (req, res) => {
  try {
    // Logs inmediatos para confirmar que la request llegó al controller
    console.log(">>> footballWebhook received");
    console.log("Headers x-signature:", req.headers["x-signature"] || req.headers["x-hub-signature"]);
    console.log("WEBHOOK_SECRET configured:", !!WEBHOOK_SECRET);
    console.log("Body preview:", JSON.stringify(req.body).slice(0, 500));

    const signatureHeader =
      req.headers["x-signature"] || req.headers["x-hub-signature"] || "";

    if (!signatureHeader || !WEBHOOK_SECRET) {
      console.warn("Webhook signature missing or secret not configured");
      return res.status(401).json({ message: "Webhook signature missing or secret not configured" });
    }

    // Usar el raw body (bytes tal cual llegaron) para calcular el HMAC
    const payloadRaw = req.rawBody ?? Buffer.from(JSON.stringify(req.body));
    const hmacHex = crypto.createHmac("sha256", WEBHOOK_SECRET).update(payloadRaw).digest("hex");
    const receivedHex = signatureHeader.includes("=") ? signatureHeader.split("=")[1] : signatureHeader;

    let receivedBuf;
    try {
      receivedBuf = Buffer.from(receivedHex, "hex");
    } catch (e) {
      console.warn("Invalid webhook signature format");
      return res.status(401).json({ message: "Invalid webhook signature format" });
    }

    const hmacBuf = Buffer.from(hmacHex, "hex");
    if (receivedBuf.length !== hmacBuf.length || !crypto.timingSafeEqual(hmacBuf, receivedBuf)) {
      console.warn("Invalid webhook signature (timingSafeEqual failed)");
      return res.status(401).json({ message: "Invalid webhook signature" });
    }

    // AQUI: await el procesamiento para que los logs salgan antes de responder
    try {
      console.log("Signature valid — calling processWebhookEvent");
      await processWebhookEvent(req.body);
      console.log("processWebhookEvent finished");
    } catch (procErr) {
      console.error("processWebhookEvent threw error:", procErr);
      // No abortamos la respuesta por ahora, devolvemos 500 para que lo veas
      return res.status(500).json({ message: "Webhook processing error" });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("footballWebhook error:", err);
    return res.status(500).json({ message: "Webhook processing error" });
  }
};

export default { footballWebhook };