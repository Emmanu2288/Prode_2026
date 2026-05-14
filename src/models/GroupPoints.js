import mongoose from "mongoose";

const { Schema } = mongoose;

const groupPointsSchema = new Schema({
  group: { type: Schema.Types.ObjectId, ref: "Group", required: true, index: true },
  user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  points: { type: Number, default: 0 },
  lastUpdated: { type: Date, default: Date.now }
}, { timestamps: true });

// Índice para consultas rápidas y evitar duplicados
groupPointsSchema.index({ group: 1, user: 1 }, { unique: true });

export default mongoose.model("GroupPoints", groupPointsSchema);
