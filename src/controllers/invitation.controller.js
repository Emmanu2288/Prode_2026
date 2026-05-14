import Invitation from "../models/Invitation.js";
import Membership from "../models/Membership.js";
import Group from "../models/Group.js";
import User from "../models/User.js";
import { sendInvitationEmail } from "../services/email.service.js";

/**
 * Invitar a un grupo (por userIds o emails).
 * Reglas:
 * - Si group.inviteOnly === true, solo el owner puede invitar.
 * - Si el email ya pertenece a un usuario, se crea la membership directamente.
 * - Si el email no existe, se crea una Invitation y se envía email con token.
 */
export const inviteToGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { userIds = [], emails = [] } = req.body;

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: "Grupo no encontrado" });

    // Permiso: si inviteOnly true, solo owner puede invitar
    if (group.inviteOnly && req.user.id !== group.owner.toString()) {
      return res.status(403).json({ message: "Solo el creador puede invitar a este grupo" });
    }

    const results = { invited: [], skipped: [], errors: [] };

    // Invitar por userIds (usuarios ya registrados)
    for (const uid of userIds) {
      try {
        // Evitar invitar al mismo owner otra vez
        if (uid === group.owner.toString()) {
          results.skipped.push({ userId: uid, reason: "Es el owner" });
          continue;
        }

        await Membership.create({ group: group._id, user: uid });
        results.invited.push({ userId: uid });
      } catch (err) {
        if (err && err.code === 11000) {
          results.skipped.push({ userId: uid, reason: "Ya es miembro" });
        } else {
          console.error("inviteToGroup membership error:", err);
          results.errors.push({ userId: uid, error: err.message || String(err) });
        }
      }
    }

    // Invitar por email (puede ser usuario existente o externo)
    for (const email of emails) {
      try {
        const normalized = email.toLowerCase().trim();
        if (!normalized) {
          results.skipped.push({ email, reason: "Email vacío o inválido" });
          continue;
        }

        const existingUser = await User.findOne({ email: normalized });

        if (existingUser) {
          // Si existe usuario, crear membership directamente
          try {
            if (existingUser._id.toString() === group.owner.toString()) {
              results.skipped.push({ email: normalized, reason: "Es el owner" });
              continue;
            }
            await Membership.create({ group: group._id, user: existingUser._id });
            results.invited.push({ email: normalized, userId: existingUser._id });
            continue;
          } catch (err) {
            if (err && err.code === 11000) {
              results.skipped.push({ email: normalized, reason: "Ya es miembro" });
              continue;
            }
            throw err;
          }
        }

        // Si no existe, crear Invitation y enviar email con token
        const invitation = await Invitation.create({
          group: group._id,
          inviter: req.user.id,
          email: normalized
        });

        // Enviar email en background (no bloquea la respuesta)
        sendInvitationEmail(invitation, group, {
          first_name: req.user.first_name,
          last_name: req.user.last_name,
          email: req.user.email
        })
          .then((r) => {
            if (!r.ok) console.warn("No se pudo enviar invitación por email:", r.error);
          })
          .catch((e) => console.error("sendInvitationEmail unexpected error:", e));

        results.invited.push({ email: normalized, invitationToken: invitation.token });
      } catch (err) {
        console.error("inviteToGroup email error:", err);
        results.errors.push({ email, error: err.message || String(err) });
      }
    }

    return res.json(results);
  } catch (err) {
    console.error("inviteToGroup error:", err);
    return res.status(500).json({ message: "Error al invitar", error: err.message || String(err) });
  }
};

/**
 * Aceptar invitación por token (GET para web, POST para API)
 * Si req.user existe, se crea la membership; si no, devolver info para registro.
 */
export const acceptInvitation = async (req, res) => {
  try {
    const token = req.body?.token || req.query?.token;
    if (!token) return res.status(400).json({ message: "Token requerido" });

    const invitation = await Invitation.findOne({ token });
    if (!invitation) return res.status(404).json({ message: "Invitación no encontrada" });
    if (invitation.status !== "pending") return res.status(400).json({ message: `Invitación ${invitation.status}` });
    if (invitation.expiresAt < new Date()) return res.status(400).json({ message: "Invitación expirada" });

    // Si el usuario está autenticado
    if (req.user && req.user.id) {
      const userId = req.user.id;

      // Crear membership si no existe
      try {
        await Membership.create({ group: invitation.group, user: userId });
      } catch (err) {
        if (err.code !== 11000) {
          console.error("acceptInvitation membership error:", err);
          return res.status(500).json({ message: "Error creando la membresía" });
        }
      }

      invitation.status = "accepted";
      invitation.invitedUser = userId;
      await invitation.save();

      return res.json({ message: "Invitación aceptada", group: invitation.group });
    }

    // Si no está autenticado, devolver info para que complete registro y use token
    return res.json({ message: "Registro requerido", email: invitation.email, token: invitation.token });
  } catch (err) {
    console.error("acceptInvitation error:", err);
    return res.status(500).json({ message: "Error al aceptar invitación", error: err.message || String(err) });
  }
};

/**
 * Rechazar invitación (token o id)
 */
export const rejectInvitation = async (req, res) => {
  try {
    const token = req.body?.token || req.params?.token;
    if (!token) return res.status(400).json({ message: "Token requerido" });

    const invitation = await Invitation.findOne({ token });
    if (!invitation) return res.status(404).json({ message: "Invitación no encontrada" });
    if (invitation.status !== "pending") return res.status(400).json({ message: `Invitación ${invitation.status}` });

    invitation.status = "rejected";
    await invitation.save();

    return res.json({ message: "Invitación rechazada" });
  } catch (err) {
    console.error("rejectInvitation error:", err);
    return res.status(500).json({ message: "Error al rechazar invitación", error: err.message || String(err) });
  }
};

export default {
  inviteToGroup,
  acceptInvitation,
  rejectInvitation
};