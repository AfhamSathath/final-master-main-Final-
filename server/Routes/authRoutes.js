import express from "express";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";
import User from "../models/User.js";
import Company from "../models/Company.js";
import Admin from "../models/admin.js";
import OTP from "../models/OTP.js";
import { register, login, magicLogin, requestMagicLink } from "../Controllers/authController.js";

const router = express.Router();

router.get("/magic-login", magicLogin);
router.post("/request-magic-link", requestMagicLink);

import generateToken from "../src/utils/generateToken.js";
import { transporter, generateOTP, sendOTP, sendLoginAlert } from "../src/utils/otpService.js";

// ====================
// REGISTER & LOGIN
// ====================
router.post("/register", register);
router.post("/login", login); // Step 1: Verify credentials and send OTP
router.post("/login-verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ success: false, message: "Email and OTP are required." });
    }

    const trimmedEmail = email.toLowerCase().trim();

    // ✅ Find OTP in database
    const otpRecord = await OTP.findOne({ email: trimmedEmail, otp });

    if (!otpRecord) {
      return res.status(400).json({ success: false, message: "Invalid or expired OTP." });
    }

    // ✅ OTP is valid - delete it
    await OTP.deleteOne({ _id: otpRecord._id });

    // ✅ Check account existence and role
    const account =
      (await User.findOne({ email: trimmedEmail })) ||
      (await Company.findOne({ email: trimmedEmail })) ||
      (await Admin.findOne({ email: trimmedEmail }));

    if (!account) {
      return res.status(404).json({ success: false, message: "Account not found." });
    }

    // ✅ Generate Token
    const token = generateToken(account._id, account.role);

    // Send async alerts
    sendLoginAlert(account.email, account.name).catch(console.error);

    return res.status(200).json({
      success: true,
      message: "Login successful!",
      _id: account._id,
      name: account.name,
      email: account.email,
      role: account.role,
      token,
    });
  } catch (error) {
    console.error("Login verify error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});


// ====================
// FORGOT PASSWORD - SEND OTP
// ====================
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    // ✅ Validate input
    if (!email || email.trim() === "") {
      return res.status(400).json({ success: false, message: "Email is required." });
    }

    const trimmedEmail = email.toLowerCase().trim();

    // ✅ Check if email exists in User, Company, or Admin
    const user = await User.findOne({ email: trimmedEmail });
    const company = await Company.findOne({ email: trimmedEmail });
    const admin = await Admin.findOne({ email: trimmedEmail });

    if (!user && !company && !admin) {
      return res.status(404).json({ success: false, message: "Email not found in any account." });
    }

    // ✅ Generate OTP manually
    const otpCode = generateOTP();

    // ✅ Delete any previous OTP
    await OTP.deleteMany({ email: trimmedEmail });

    // ✅ Save to DB
    const otpRecord = new OTP({ email: trimmedEmail, otp: otpCode });
    await otpRecord.save();

    // ✅ Send the EXACT same OTP branded
    const mailRes = await sendOTP(trimmedEmail, otpCode);



    return res.status(200).json({
      success: true,
      message: "OTP sent to your email successfully.",
      email: trimmedEmail,
    });

  } catch (error) {
    console.error("Forgot password error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
});

// ====================
// VERIFY OTP
// ====================
router.post("/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;

    // ✅ Validate input
    if (!email || !otp) {
      return res.status(400).json({ success: false, message: "Email and OTP are required." });
    }

    const trimmedEmail = email.toLowerCase().trim();

    // ✅ Find OTP in database
    const otpRecord = await OTP.findOne({ email: trimmedEmail, otp });

    if (!otpRecord) {
      return res.status(400).json({ success: false, message: "Invalid or expired OTP." });
    }

    // ✅ OTP is valid - delete it
    await OTP.deleteOne({ _id: otpRecord._id });

    // ✅ Check if user exists (for frontend to proceed to password reset)
    const user = await User.findOne({ email: trimmedEmail });
    const company = await Company.findOne({ email: trimmedEmail });
    const admin = await Admin.findOne({ email: trimmedEmail });

    if (!user && !company && !admin) {
      return res.status(404).json({ success: false, message: "Email not found." });
    }

    return res.status(200).json({
      success: true,
      message: "OTP verified successfully. You can now reset your password.",
      email: trimmedEmail,
    });
  } catch (error) {
    console.error("Verify OTP error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
});

// ====================
// RESET PASSWORD
// ====================
router.post("/reset-password", async (req, res) => {
  try {
    const { email, password } = req.body;

    // ✅ Validate input
    if (!email || !password || password.trim() === "") {
      return res.status(400).json({ success: false, message: "Email and password are required." });
    }

    const trimmedEmail = email.toLowerCase().trim();

    // ✅ Find account in User, Company, or Admin
    let account = await User.findOne({ email: trimmedEmail });
    let accountType = "User";

    if (!account) {
      account = await Company.findOne({ email: trimmedEmail });
      accountType = "Company";
    }
    if (!account) {
      account = await Admin.findOne({ email: trimmedEmail });
      accountType = "Admin";
    }

    if (!account) {
      return res.status(404).json({ success: false, message: "Account not found." });
    }

    // ✅ Hash the new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // ✅ Update password
    account.password = hashedPassword;
    await account.save();

    // ✅ Send Password Change Notification
    await sendWorkflowEmail(
      account.email,
      account.name,
      "Password Successfully Reset",
      "Your password for the Qualification Based Job Finder System has been successfully reset. If you did not make this change, please secure your account immediately."

    );

    return res.status(200).json({
      success: true,
      message: `${accountType} password updated successfully!`,
    });

  } catch (error) {
    console.error("Reset password error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
});

// ====================
// REGISTRATION - SEND OTP
// ====================
router.post("/register-send-otp", async (req, res) => {
  try {
    const { email, name } = req.body;

    // ✅ Validate input
    if (!email || email.trim() === "") {
      return res.status(400).json({ success: false, message: "Email is required." });
    }

    const trimmedEmail = email.toLowerCase().trim();

    // ✅ Check if email is already registered
    const existingUser = await User.findOne({ email: trimmedEmail });
    const existingCompany = await Company.findOne({ email: trimmedEmail });
    const existingAdmin = await Admin.findOne({ email: trimmedEmail });

    if (existingUser || existingCompany || existingAdmin) {
      return res.status(409).json({
        success: false,
        message: "Email is already registered. Please login or use a different email.",
      });
    }

    // ✅ Pre-generate OTP
    const otpCode = generateOTP();

    // ✅ Delete existing
    await OTP.deleteMany({ email: trimmedEmail });

    // ✅ Save to DB
    const otpRecord = new OTP({
      email: trimmedEmail,
      otp: otpCode,
    });
    await otpRecord.save();

    // ✅ Send branded with the generated OTP
    const mailRes = await sendOTP(trimmedEmail, otpCode);

    if (!mailRes.success) {
      return res.status(500).json({
        success: false,
        message: "Failed to send OTP. Please check your email configuration.",
      });
    }
    return res.status(200).json({
      success: true,
      message: "OTP sent successfully to your email.",
    });


  } catch (error) {
    console.error("Send registration OTP error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to send OTP. Please try again later.",
    });
  }
});

// ====================
// REGISTRATION - VERIFY OTP
// ====================
router.post("/register-verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;

    // ✅ Validate input
    if (!email || email.trim() === "") {
      return res.status(400).json({ success: false, message: "Email is required." });
    }
    if (!otp || otp.trim() === "") {
      return res.status(400).json({ success: false, message: "OTP is required." });
    }

    const trimmedEmail = email.toLowerCase().trim();
    const trimmedOtp = otp.trim();

    // ✅ Find OTP in database
    console.log(`Verifying OTP for: ${trimmedEmail}`);
    const otpRecord = await OTP.findOne({ email: trimmedEmail });

    if (!otpRecord) {
      console.log(`❌ No OTP found in DB for: ${trimmedEmail}`);
      return res.status(404).json({
        success: false,
        message: "OTP not found or has expired. Please request a new one.",
      });
    }

    console.log(`DB OTP: [${otpRecord.otp}], Received OTP: [${trimmedOtp}]`);

    // ✅ Verify OTP matches
    if (otpRecord.otp !== trimmedOtp) {
      console.log(`❌ OTP Mismatch!`);
      return res.status(400).json({
        success: false,
        message: "Invalid OTP. Please try again.",
      });
    }


    // ✅ Delete OTP after successful verification (one-time use)
    await OTP.deleteOne({ _id: otpRecord._id });

    return res.status(200).json({
      success: true,
      message: "Email verified successfully. Proceed with registration.",
    });
  } catch (error) {
    console.error("Verify registration OTP error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
});

export default router;
