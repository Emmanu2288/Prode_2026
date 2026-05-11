import mongoose from "mongoose";

const predictionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

  // Pronóstico partido a partido
  match: { type: mongoose.Schema.Types.ObjectId, ref: "Match" }, 
  predictedScore: { type: String }, // ej: "3-1"

  // Extras del Mundial
  worldChampion: { type: String },      // ej: "Argentina"
  bestPlayer: { type: String },         // ej: "Lionel Messi"
  topScorer: { type: String },          // ej: "Mbappé"
  bestGoalkeeper: { type: String },     // ej: "Thibaut Courtois"
  revelationTeam: { type: String },     // ej: "Croacia"

}, { timestamps: true });

export default mongoose.model("Prediction", predictionSchema);
