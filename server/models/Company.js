// server/models/Company.js
import mongoose from "mongoose";

const companySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    location: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    contactNumber: { type: String, required: true },
    regNumber: { type: String, required: true },
    password: { type: String, required: true },
    address: { type: String },
    role: { type: String, default: "company" },

    resetToken: { type: String },
    resetTokenExpiry: { type: Date },

    otpRequired: { type: Boolean, default: true },
    magicToken: { type: String },
    magicTokenExpiry: { type: Date },

    verificationStatus: {
      type: String,
      enum: ["pending", "verified", "rejected"],
      default: "pending",
    },
    documents: [{ type: String }], // URLs or filenames of submitted documents
    rejectionReason: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model("Company", companySchema);
