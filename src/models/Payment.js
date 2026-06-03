import mongoose from "mongoose";
const { Schema } = mongoose;

const paymentSchema = new Schema({
  group: { type: Schema.Types.ObjectId, ref: "Group", required: true, index: true },
  user:  { type: Schema.Types.ObjectId, ref: "User",  required: true, index: true },
  phase: { type: String, required: true }, // "unico" para grupo 1, "fase1"..."final" para grupo 2
  paid:  { type: Boolean, default: false },
  paidAt: { type: Date },
  notes:  { type: String },
}, { timestamps: true });

paymentSchema.index({ group: 1, user: 1, phase: 1 }, { unique: true });

export default mongoose.model("Payment", paymentSchema);
