import mongoose from "mongoose";

const { Schema } = mongoose;

const mvpPredictionSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  match: { type: Schema.Types.ObjectId, ref: "Match", required: true, index: true },
  mvpPlayer: { type: String, required: true, trim: true, maxlength: 100 }
}, { timestamps: true });

// Evita que un mismo usuario cree más de una predicción para el mismo partido
mvpPredictionSchema.index({ user: 1, match: 1 }, { unique: true });

export default mongoose.model("MvpPrediction", mvpPredictionSchema);
