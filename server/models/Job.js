// models/Job.js
import mongoose from "mongoose";

const JobSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, default: "" },
    company: { type: String, required: true }, // Assuming company is stored as a string (name or ID)
    qualification: { type: String, default: "" },
    openDate: { type: Date, required: true },
    closeDate: { type: Date, required: true },
    category: { type: String, default: "" }, // Optional category field
    positionType: {
      type: String,
      enum: ["full-time", "part-time", "internship"],
      default: "full-time",
    },
    paymentType: {
      type: String,
      enum: ["paid", "unpaid"],
      default: "paid",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Job", JobSchema);
