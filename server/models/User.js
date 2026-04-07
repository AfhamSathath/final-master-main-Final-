import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  role: { type: String, default: "user" },

  contactNumber: String,
  location: String,
  resetToken: { type: String },
  resetTokenExpiry: { type: Date },
  otpRequired: { type: Boolean, default: true },
  magicToken: { type: String },
  magicTokenExpiry: { type: Date },
  
  


  qualificationCategory: { type: String, default: "" },
  qualification: { type: [String], default: [] },
}, { timestamps: true });


export default mongoose.model("User", userSchema);