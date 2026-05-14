import mongoose from "mongoose";

const { Schema } = mongoose;

const groupSchema = new Schema({
  name: { type: String, required: true, trim: true },
  owner: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  description: { type: String, trim: true },
  isPublic: { type: Boolean, default: false },
  inviteOnly: { type: Boolean, default: true } // si true, solo owner puede invitar
}, { timestamps: true });

export default mongoose.model("Group", groupSchema);
