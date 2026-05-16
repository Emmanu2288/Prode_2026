import mongoose from "mongoose";

const CorrectionSchema = new mongoose.Schema({
  matchId: { type: String, required: true, index: true },
  predictionId: { type: mongoose.Schema.Types.ObjectId, ref: "Prediction", required: false },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false },
  field: { type: String, required: true }, // e.g., "points", "mvp"
  before: { type: mongoose.Schema.Types.Mixed },
  after: { type: mongoose.Schema.Types.Mixed },
  diff: { type: Number, required: false }, // para puntos: after - before
  reason: { type: String, required: true }, // e.g., "missing webhook", "api mismatch"
  processedBy: { type: String, default: "reconciler" }, // "reconciler" o "admin"
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("Correction", CorrectionSchema);