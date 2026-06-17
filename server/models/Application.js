import mongoose from "mongoose";

const ApplicationSchema = new mongoose.Schema(
  {
    jobId: { type: mongoose.Schema.Types.ObjectId, ref: "Job", required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    companyName: { type: String, required: true },
    status: { type: String, enum: ["pending", "reviewed", "accepted", "rejected"], default: "pending" },
  },
  { timestamps: true }
);

export default mongoose.model("Application", ApplicationSchema);
