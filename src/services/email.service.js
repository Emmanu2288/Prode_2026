import nodemailer from "nodemailer";
import sgMail from "@sendgrid/mail";

const PROVIDER = (process.env.EMAIL_PROVIDER || "nodemailer").toLowerCase();
const FROM = process.env.EMAIL_FROM || "no-reply@tuapp.com";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

let transporter = null;

if (PROVIDER === "sendgrid") {
  if (!process.env.SENDGRID_API_KEY) {
    console.warn("SENDGRID_API_KEY no configurada. SendGrid no estará disponible.");
  } else {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  }
} else {
  // Nodemailer por defecto (SMTP)
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587,
    secure: process.env.SMTP_SECURE === "true", // true para 465
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
}

/**
 * Construye el link de invitación
 */
const buildInvitationLink = (token) => {
  return `${FRONTEND_URL}/invite/accept?token=${token}`;
};


export const sendInvitationEmail = async (invitation, group, inviter = {}) => {
  const to = invitation.email;
  const link = buildInvitationLink(invitation.token);
  const subject = `Invitación a unirse al grupo "${group.name}"`;
  const inviterName = inviter?.first_name ? `${inviter.first_name} ${inviter.last_name || ""}`.trim() : "Un usuario";
  const text = [
    `${inviterName} te ha invitado a unirte al grupo "${group.name}" en nuestra aplicación.`,
    "",
    `Para aceptar la invitación, hacé clic en el siguiente enlace: ${link}`,
    "",
    "Si no tenés cuenta, podés registrarte y la invitación se aplicará automáticamente.",
    "",
    "Si no solicitaste esta invitación, podés ignorar este correo.",
    "",
    "Saludos."
  ].join("\n");

  const html = `<p>${inviterName} te ha invitado a unirte al grupo "<strong>${group.name}</strong>" en nuestra aplicación.</p>
<p>Para aceptar la invitación, hacé clic en el siguiente enlace:</p>
<p><a href="${link}">${link}</a></p>
<p>Si no tenés cuenta, podés registrarte y la invitación se aplicará automáticamente.</p>
<p>Si no solicitaste esta invitación, podés ignorar este correo.</p>`;

  try {
    if (PROVIDER === "sendgrid") {
      const msg = {
        to,
        from: FROM,
        subject,
        text,
        html
      };
      await sgMail.send(msg);
      return { ok: true };
    } else {
      // Nodemailer
      if (!transporter) throw new Error("SMTP transporter no configurado");
      await transporter.sendMail({
        from: FROM,
        to,
        subject,
        text,
        html
      });
      return { ok: true };
    }
  } catch (err) {
    console.error("sendInvitationEmail error:", err);
    return { ok: false, error: err.message || String(err) };
  }
};