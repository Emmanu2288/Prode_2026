import mongoose from "mongoose";

const { Schema } = mongoose;

const processedFixtureSchema = new Schema({
  matchId: { type: String, required: true, index: true }, // sin unique: true — el índice único es compuesto
  eventId: { type: String, required: false },
  type: { type: String, enum: ["assigned_default", "scored", "live_event"], required: true },
  mvp: { type: String, default: null }, // figura del partido (real), visible para todos los usuarios
  processedAt: { type: Date, default: Date.now }
});

// Un solo documento "scored" por partido
processedFixtureSchema.index(
  { matchId: 1, type: 1 },
  { unique: true, partialFilterExpression: { type: "scored" } }
);

// Un solo documento por evento en vivo (matchId + eventId únicos cuando eventId existe)
processedFixtureSchema.index(
  { matchId: 1, eventId: 1 },
  { unique: true, sparse: true }
);

export default mongoose.model("ProcessedFixture", processedFixtureSchema);
