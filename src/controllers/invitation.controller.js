import Invitation from "../models/Invitation.js";
import Membership from "../models/Membership.js";
import Group from "../models/Group.js";
import User from "../models/User.js";
import { notifyUserInvitation } from "../services/notification.service.js";

/**
 * Invitar a un grupo (por userIds o emails).
 * Reglas:
 * - Si group.inviteOnly === true, solo el owner puede invitar.
 * - Si el usuario ya está registrado: se crea una Invitation y se le notifica
 *   via Socket.IO para que acepte o rechace desde la app.
 * - Si el email no existe en la app: se crea una Invitation y se devuelve
 *   un link de registro para compartir manualmente.
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

    const inviter = await User.findById(req.user.id).lean();
    const results = { invited: [], skipped: [], errors: [] };

    // Invitar por userId (usuarios ya registrados) — se crea Invitation + notificación in-app
    for (const uid of userIds) {
      try {
        if (uid === group.owner.toString()) {
          results.skipped.push({ userId: uid, reason: "Es el owner" });
          continue;
        }

        // Verificar si ya es miembro
        const isMember = await Membership.exists({ group: group._id, user: uid });
        if (isMember) {
          results.skipped.push({ userId: uid, reason: "Ya es miembro" });
          continue;
        }

        // Verificar si ya tiene invitación pendiente
        const pendingInvitation = await Invitation.findOne({
          group: group._id,
          invitedUser: uid,
          status: "pending"
        });
        if (pendingInvitation) {
          results.skipped.push({ userId: uid, reason: "Ya tiene invitación pendiente" });
          continue;
        }

        // Crear Invitation para el usuario registrado
        const invitation = await Invitation.create({
          group: group._id,
          inviter: req.user.id,
          invitedUser: uid
        });

        // Notificar al usuario via Socket.IO (si está conectado)
        notifyUserInvitation(uid, invitation, group, inviter);

        results.invited.push({ userId: uid, invitationToken: invitation.token });
      } catch (err) {
        console.error("inviteToGroup userId error:", err);
        results.errors.push({ userId: uid, error: err.message || String(err) });
      }
    }

    // Normalizar emails (puede venir como string o array)
    const emailList = Array.isArray(emails) ? emails : [emails];

    // Invitar por email
    for (const email of emailList) {
      try {
        const normalized = email.toLowerCase().trim();
        if (!normalized) {
          results.skipped.push({ email, reason: "Email vacío o inválido" });
          continue;
        }

        const existingUser = await User.findOne({ email: normalized });

        if (existingUser) {
          // Si el usuario existe pero no fue pasado como userId, lo tratamos igual
          if (existingUser._id.toString() === group.owner.toString()) {
            results.skipped.push({ email: normalized, reason: "Es el owner" });
            continue;
          }

          const isMember = await Membership.exists({ group: group._id, user: existingUser._id });
          if (isMember) {
            results.skipped.push({ email: normalized, reason: "Ya es miembro" });
            continue;
          }

          const pendingInvitation = await Invitation.findOne({
            group: group._id,
            invitedUser: existingUser._id,
            status: "pending"
          });
          if (pendingInvitation) {
            results.skipped.push({ email: normalized, reason: "Ya tiene invitación pendiente" });
            continue;
          }

          const invitation = await Invitation.create({
            group: group._id,
            inviter: req.user.id,
            invitedUser: existingUser._id,
            email: normalized
          });

          notifyUserInvitation(existingUser._id.toString(), invitation, group, inviter);
          results.invited.push({ email: normalized, userId: existingUser._id, invitationToken: invitation.token });
          continue;
        }

        // Si el email no existe en la app: crear Invitation y devolver link de registro
        const invitation = await Invitation.create({
          group: group._id,
          inviter: req.user.id,
          email: normalized
        });

        const link = `${process.env.FRONTEND_URL || "http://localhost:5173"}/register?token=${invitation.token}`;
        results.invited.push({ email: normalized, invitationToken: invitation.token, link });
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
 * Listar invitaciones pendientes del usuario autenticado
 */
export const getMyPendingInvitations = async (req, res) => {
  try {
    const invitations = await Invitation.find({
      invitedUser: req.user.id,
      status: "pending",
      expiresAt: { $gt: new Date() }
    })
      .populate("group", "name description")
      .populate("inviter", "first_name last_name email")
      .lean();

    return res.json(invitations);
  } catch (err) {
    console.error("getMyPendingInvitations error:", err);
    return res.status(500).json({ message: "Error al obtener invitaciones", error: err.message || String(err) });
  }
};

/**
 * Aceptar invitación por token
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

      try {
        await Membership.create({ group: invitation.group, user: userId });
      } catch (err) {
        if (err.code !== 11000) {
          console.error("acceptInvitation membership error:", err);
          return res.status(500).json({ message: "Error creando la membresía" });
        }
      }

      invitation.status = "accepted";
      invitation.invitedUser = invitation.invitedUser || userId;
      await invitation.save();

      // Notificar al invitador que fue aceptado
      if (invitation.inviter && globalThis.io) {
        globalThis.io.to(`user_${invitation.inviter}`).emit("invitation_accepted", {
          groupId: invitation.group,
          acceptedBy: userId
        });
      }

      return res.json({ message: "Invitación aceptada", group: invitation.group });
    }

    // Si no está autenticado, devolver info para que complete el registro
    return res.json({
      message: "Registro requerido para aceptar la invitación",
      email: invitation.email,
      token: invitation.token,
      registerUrl: `${process.env.FRONTEND_URL || "http://localhost:5173"}/register?token=${invitation.token}`
    });
  } catch (err) {
    console.error("acceptInvitation error:", err);
    return res.status(500).json({ message: "Error al aceptar invitación", error: err.message || String(err) });
  }
};

/**
 * Rechazar invitación por token
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

    // Notificar al invitador que fue rechazado
    if (invitation.inviter && globalThis.io) {
      globalThis.io.to(`user_${invitation.inviter}`).emit("invitation_rejected", {
        groupId: invitation.group,
        rejectedBy: req.user?.id || null
      });
    }

    return res.json({ message: "Invitación rechazada" });
  } catch (err) {
    console.error("rejectInvitation error:", err);
    return res.status(500).json({ message: "Error al rechazar invitación", error: err.message || String(err) });
  }
};

export default {
  inviteToGroup,
  getMyPendingInvitations,
  acceptInvitation,
  rejectInvitation
};
