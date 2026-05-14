import mongoose from "mongoose";

const { Schema } = mongoose;

const predictionSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  match: { type: Schema.Types.ObjectId, ref: "Match", index: true },
  predictedScore: { type: String },
  worldChampion: { type: String },
  bestPlayer: { type: String },
  topScorer: { type: String },
  bestGoalkeeper: { type: String },
  revelationTeam: { type: String }
}, { timestamps: true });

// Evita duplicados user+match
predictionSchema.index({ user: 1, match: 1 }, { unique: true });

export default mongoose.model("Prediction", predictionSchema);
