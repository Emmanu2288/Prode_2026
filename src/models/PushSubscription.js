import mongoose from "mongoose";
const { Schema } = mongoose;

const pushSubscriptionSchema = new Schema({
  user:         { type: Schema.Types.ObjectId, ref: "User", required: true },
  endpoint:     { type: String, required: true, unique: true },
  keys: {
    p256dh: { type: String, required: true },
    auth:   { type: String, required: true },
  },
}, { timestamps: true });

export default mongoose.model("PushSubscription", pushSubscriptionSchema);
