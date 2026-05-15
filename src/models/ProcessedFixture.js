import mongoose from "mongoose";

const { Schema } = mongoose;

const processedFixtureSchema = new Schema({
  matchId: { type: String, required: true, unique: true, index: true },
  eventId: { type: String, required: false },
  type: { type: String, enum: ["assigned_default", "scored", "live_event"], required: true },
  processedAt: { type: Date, default: Date.now }
});

export default mongoose.model("ProcessedFixture", processedFixtureSchema);