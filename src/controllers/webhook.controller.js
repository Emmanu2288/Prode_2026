import crypto from "crypto";
import { processWebhookEvent } from "../services/webhook.processor.js";

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || "";

export const footballWebhook = async (req, res) => {
  try {
    const signatureHeader =
      req.headers["x-signature"] || req.headers["x-hub-signature"] || "";

    if (!signatureHeader || !WEBHOOK_SECRET) {
      return res.status(401).json({ message: "Webhook signature missing or secret not configured" });
    }

    // Usar el raw body (bytes tal cual llegaron) para calcular el HMAC
    const payloadRaw = req.rawBody ?? Buffer.from(JSON.stringify(req.body));

    const hmacHex = crypto.createHmac("sha256", WEBHOOK_SECRET).update(payloadRaw).digest("hex");

    // Algunos proveedores envían "sha256=<hex>" u otros formatos
    const receivedHex = signatureHeader.includes("=") ? signatureHeader.split("=")[1] : signatureHeader;

    // Validar que ambos hex tengan la misma longitud antes de timingSafeEqual
    const hmacBuf = Buffer.from(hmacHex, "hex");
    let receivedBuf;
    try {
      receivedBuf = Buffer.from(receivedHex, "hex");
    } catch (e) {
      return res.status(401).json({ message: "Invalid webhook signature format" });
    }

    if (receivedBuf.length !== hmacBuf.length) {
      return res.status(401).json({ message: "Invalid webhook signature" });
    }

    if (!crypto.timingSafeEqual(hmacBuf, receivedBuf)) {
      return res.status(401).json({ message: "Invalid webhook signature" });
    }

    // Procesar evento en background (no bloquear la respuesta)
    processWebhookEvent(req.body)
      .then(() => {
        // procesado en background
      })
      .catch((err) => {
        console.error("processWebhookEvent error:", err);
      });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("footballWebhook error:", err);
    return res.status(500).json({ message: "Webhook processing error" });
  }
};

export default { footballWebhook };