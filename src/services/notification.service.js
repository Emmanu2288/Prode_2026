/**
 * notification.service.js
 * Notificaciones in-app via Socket.IO.
 * No envía emails — las invitaciones se manejan internamente en la app.
 */

/**
 * Notifica a un usuario registrado que tiene una invitación pendiente.
 * El cliente debe estar conectado a Socket.IO y unirse a su sala personal
 * emitiendo: socket.emit("join_user", { userId })
 *
 * @param {string} userId     - ID del usuario invitado
 * @param {object} invitation - Documento de Invitation de Mongoose
 * @param {object} group      - Documento del Group de Mongoose
 * @param {object} inviter    - Usuario que invita { first_name, last_name }
 */
export const notifyUserInvitation = (userId, invitation, group, inviter = {}) => {
  if (!globalThis.io) {
    console.warn("notifyUserInvitation: Socket.IO no disponible");
    return;
  }

  const inviterName = inviter?.first_name
    ? `${inviter.first_name} ${inviter.last_name || ""}`.trim()
    : "Un usuario";

  globalThis.io.to(`user_${userId}`).emit("invitation_received", {
    invitationId: invitation._id,
    token: invitation.token,
    groupId: group._id,
    groupName: group.name,
    inviterName,
    expiresAt: invitation.expiresAt,
    message: `${inviterName} te invitó a unirte al grupo "${group.name}"`
  });

  console.log(`📨 Notificación de invitación enviada a user_${userId} → grupo "${group.name}"`);
};

/**
 * Emite un anuncio a todos los clientes conectados por Socket.IO.
 * Lo reciben en tiempo real los usuarios con la app abierta (campana de notificaciones).
 *
 * @param {object} announcement - { title, message, url }
 */
export const broadcastAnnouncement = ({ title, message, url = "/" }) => {
  if (!globalThis.io) {
    console.warn("broadcastAnnouncement: Socket.IO no disponible");
    return;
  }

  globalThis.io.emit("announcement", { title, message, url });
  console.log(`📢 Anuncio emitido a todos los conectados: "${title}"`);
};
