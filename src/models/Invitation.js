import mongoose from "mongoose";
import crypto from "crypto";

const { Schema } = mongoose;

const invitationSchema = new Schema({
  group: { type: Schema.Types.ObjectId, ref: "Group", required: true, index: true },
  inviter: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  email: { type: String, required: false, lowercase: true, trim: true },
  invitedUser: { type: Schema.Types.ObjectId, ref: "User", required: false },
  token: { type: String, required: true, unique: true, index: true },
  status: { type: String, enum: ["pending", "accepted", "rejected", "revoked"], default: "pending" },
  expiresAt: { type: Date, required: true }
}, { timestamps: true });

// Generador de token antes de validar/guardar si no viene token
invitationSchema.pre("validate", function(next) {
  if (!this.token) {
    this.token = crypto.randomBytes(20).toString("hex");
  }
  if (!this.expiresAt) {
    // por defecto expira en 7 días
    this.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  }
  next();
});

export default mongoose.model("Invitation", invitationSchema);