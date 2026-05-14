import mongoose from "mongoose";

const { Schema } = mongoose;

const membershipSchema = new Schema({
  group: { type: Schema.Types.ObjectId, ref: "Group", required: true, index: true },
  user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  roleInGroup: { type: String, enum: ["owner", "moderator", "member"], default: "member" },
  joinedAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Evita duplicados user+group
membershipSchema.index({ group: 1, user: 1 }, { unique: true });

export default mongoose.model("Membership", membershipSchema);
