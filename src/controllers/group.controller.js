import Group from "../models/Group.js";
import Membership from "../models/Membership.js";
import GroupPoints from "../models/GroupPoints.js";
import { inviteToGroup as inviteToGroupController } from "./invitation.controller.js";

export const createGroup = async (req, res) => {
  try {
    const { name, description, isPublic = false, inviteOnly = true } = req.body;
    if (!name) return res.status(400).json({ message: "El nombre del grupo es requerido" });

    const group = await Group.create({
      name,
      description,
      owner: req.user.id,
      isPublic,
      inviteOnly
    });

    // Crear membership del owner (role owner)
    try {
      await Membership.create({ group: group._id, user: req.user.id, roleInGroup: "owner" });
    } catch (err) {
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

/**
 * Leaderboard por grupo (usa GroupPoints si existe)
 */
export const getGroupLeaderboard = async (req, res) => {
  try {
    const { groupId } = req.params;
    const leaderboard = await GroupPoints.find({ group: groupId })
      .sort({ points: -1 })
      .limit(100)
      .populate("user", "first_name last_name email");
    return res.json(leaderboard);
  } catch (err) {
    console.error("getGroupLeaderboard error:", err);
    return res.status(500).json({ message: "Error al obtener leaderboard" });
  }
};

export default {
  createGroup,
  inviteToGroup,
  getGroupMembers,
  getGroupLeaderboard
};