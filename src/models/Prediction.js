import mongoose from "mongoose";

const { Schema } = mongoose;

const predictionSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  // Referencia interna opcional al documento Match
  match: { type: Schema.Types.ObjectId, ref: "Match", index: true, required: false },
  // ID del proveedor / fixture id externo (string). Recomendado para búsquedas desde webhooks.
  matchId: { type: String, index: true, required: false },
  predictedScore: { type: String },
  mvpPlayer: { type: String },
  points: { type: Number, default: 0 },
  worldChampion: { type: String },
  bestPlayer: { type: String },
  topScorer: { type: String },
  bestGoalkeeper: { type: String },
  revelationTeam: { type: String }
}, { timestamps: true });

// Evita duplicados user+match (prioriza match si existe, sino matchId)
predictionSchema.index({ user: 1, match: 1 }, { unique: true, partialFilterExpression: { match: { $exists: true } } });
predictionSchema.index({ user: 1, matchId: 1 }, { unique: true, partialFilterExpression: { matchId: { $exists: true } } });

export default mongoose.model("Prediction", predictionSchema);
