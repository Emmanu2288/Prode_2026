import Payment from "../models/Payment.js";
import Membership from "../models/Membership.js";

// Fases del Mundial 2026
export const PHASES_SINGLE = ["unico"];
export const PHASES_MULTI  = [
  "Fase de grupos 1",
  "Fase de grupos 2",
  "Fase de grupos 3",
  "Octavos de final",
  "Cuartos de final",
  "Semifinales",
  "3° y 4° puesto",
  "Final",
];

/**
 * GET /api/payments/group/:groupId
 * Devuelve estado de pagos de todos los miembros del grupo
 */
export const getGroupPayments = async (req, res) => {
  try {
    const { groupId } = req.params;

    const members = await Membership.find({ group: groupId })
      .populate("user", "first_name last_name email")
      .lean();

    const payments = await Payment.find({ group: groupId }).lean();

    // Construir mapa user -> pagos
    const paymentMap = {};
    for (const p of payments) {
      const uid = p.user.toString();
      if (!paymentMap[uid]) paymentMap[uid] = {};
      paymentMap[uid][p.phase] = { paid: p.paid, paidAt: p.paidAt, notes: p.notes, _id: p._id };
    }

    const result = members.map((m) => ({
      userId:    m.user?._id,
      name:      `${m.user?.first_name} ${m.user?.last_name}`,
      email:     m.user?.email,
      payments:  paymentMap[m.user?._id?.toString()] || {},
    }));

    return res.json(result);
  } catch (err) {
    console.error("getGroupPayments error:", err);
    return res.status(500).json({ message: "Error al obtener pagos" });
  }
};

/**
 * PATCH /api/payments/group/:groupId/user/:userId/phase/:phase
 * Marca/desmarca una fase como pagada
 */
export const togglePayment = async (req, res) => {
  try {
    const { groupId, userId, phase } = req.params;
    const { paid, notes } = req.body;

    const payment = await Payment.findOneAndUpdate(
      { group: groupId, user: userId, phase },
      {
        paid,
        paidAt: paid ? new Date() : null,
        notes:  notes || "",
      },
      { new: true, upsert: true }
    );

    return res.json(payment);
  } catch (err) {
    console.error("togglePayment error:", err);
    return res.status(500).json({ message: "Error al actualizar pago" });
  }
};
