// models/Course.js
import mongoose from "mongoose";

const CourseSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String, default: "" },
    institution: { type: String, required: true },
    qualification: { type: String, default: "" },
    duration: { type: String, default: "" },
    category: { type: String, default: "" },
    courseType: {
      type: String,
      enum: ["full-time", "part-time"],
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

export default mongoose.model("Course", CourseSchema);
