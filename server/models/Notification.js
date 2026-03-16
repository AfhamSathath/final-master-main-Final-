import mongoose from "mongoose";

const NotificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, enum: ["course", "job"], required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    referenceId: { type: mongoose.Schema.Types.ObjectId, default: null },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model("Notification", NotificationSchema);
