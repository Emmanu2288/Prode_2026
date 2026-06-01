import Group from "../models/Group.js";
import Membership from "../models/Membership.js";
import Prediction from "../models/Prediction.js";
import { inviteToGroup as inviteToGroupController } from "./invitation.controller.js";

// Eliminar grupo (solo owner)
export const deleteGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: "Grupo no encontrado" });
    if (group.owner.toString() !== req.user.id) {
      return res.status(403).json({ message: "Solo el creador puede eliminar el grupo" });
    }
    await Group.findByIdAndDelete(groupId);
    await Membership.deleteMany({ group: groupId });
    return res.json({ message: "Grupo eliminado correctamente" });
  } catch (err) {
    console.error("deleteGroup error:", err);
    return res.status(500).json({ message: "Error al eliminar el grupo" });
  }
};

// Predicciones de todos los miembros del grupo agrupadas por matchId
export const getGroupPredictions = async (req, res) => {
  try {
    const { groupId } = req.params;
    const memberships = await Membership.find({ group: groupId }).lean();
    const userIds = memberships.map((m) => m.user);

    const predictions = await Prediction.find({
      user: { $in: userIds },
      matchId: { $exists: true },
      predictedScore: { $exists: true },
    })
      .populate("user", "first_name last_name")
      .lean();

    // Agrupar por matchId
    const byMatch = {};
    for (const pred of predictions) {
      if (!byMatch[pred.matchId]) byMatch[pred.matchId] = [];
      byMatch[pred.matchId].push({
        userId:         pred.user?._id,
        userName:       `${pred.user?.first_name} ${pred.user?.last_name}`,
        predictedScore: pred.predictedScore,
        mvpPlayer:      pred.mvpPlayer,
        points:         pred.points ?? 0,
      });
    }

    return res.json(byMatch);
  } catch (err) {
    console.error("getGroupPredictions error:", err);
    return res.status(500).json({ message: "Error al obtener predicciones del grupo" });
  }
};

// Listar grupos donde el usuario es miembro
export const getMyGroups = async (req, res) => {
  try {
    const memberships = await Membership.find({ user: req.user.id })
      .populate("group")
      .lean();
    const groups = memberships
      .filter((m) => m.group)
      .map((m) => ({ ...m.group, roleInGroup: m.roleInGroup }));
    return res.json(groups);
  } catch (err) {
    console.error("getMyGroups error:", err);
    return res.status(500).json({ message: "Error al obtener grupos" });
  }
};

// Detalle de un grupo
export const getGroupById = async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId).populate("owner", "first_name last_name email");
    if (!group) return res.status(404).json({ message: "Grupo no encontrado" });
    return res.json(group);
  } catch (err) {
    console.error("getGroupById error:", err);
    return res.status(500).json({ message: "Error al obtener el grupo" });
  }
};

export const createGroup = async (req, res) => {
  try {
    const { name, description, isPublic = false, inviteOnly = true } = req.body;
    if (!name) return res.status(400).json({ message: "El nombre del grupo es requerido" });

    // Normalizar owner: preferimos req.user.id, pero soportamos sub/_id o fallback a body.owner
    const ownerId = req.user?.id || req.user?.sub || req.user?._id || req.body?.owner;
    if (!ownerId) {
      return res.status(400).json({ message: "Owner no especificado. Asegurate de enviar Authorization Bearer token." });
    }

    const group = await Group.create({
      name,
      description,
      owner: ownerId,
      isPublic,
      inviteOnly
    });

    // Crear membership del owner (role owner)
    try {
      await Membership.create({ group: group._id, user: ownerId, roleInGroup: "owner" });
    } catch (err) {
      // Si es duplicado (11000) lo ignoramos; si no, lo logueamos
      if (err.code !== 11000) console.error("createGroup membership error:", err);
    }

    return res.status(201).json({ message: "Grupo creado", group });
  } catch (err) {
    console.error("createGroup error:", err);
    return res.status(500).json({ message: "Error creando el grupo" });
  }
};

export const inviteToGroup = async (req, res) => {
  return inviteToGroupController(req, res);
};

/**
 * Listar miembros de un grupo
 */
export const getGroupMembers = async (req, res) => {
  try {
    const { groupId } = req.params;
    const members = await Membership.find({ group: groupId }).populate("user", "-password");
    return res.json(members);
  } catch (err) {
    console.error("getGroupMembers error:", err);
    return res.status(500).json({ message: "Error al obtener miembros" });
  }
};

export default {
  createGroup,
  inviteToGroup,
  getGroupMembers
};