import User from "../models/User.js";
import Company from "../models/Company.js";
import bcrypt from "bcryptjs";
import { sendWorkflowEmail } from "../src/utils/otpService.js";
import { checkAndSendDeadlineAlert } from "../src/utils/deadlineAlertService.js";

// ================== CREATE USER ==================
export const createUser = async (req, res) => {
  try {
    const { name, email, password, role, qualificationCategory, qualification, contactNumber, location } = req.body;
    const normalizedEmail = email?.toLowerCase().trim();

    // Check if user already exists by email or phone across User and Company collections
    const duplicateUser = await User.findOne({
      $or: [{ email: normalizedEmail }, { contactNumber }],
    });
    const duplicateCompany = await Company.findOne({
      $or: [{ email: normalizedEmail }, { contactNumber }],
    });
    if (duplicateUser || duplicateCompany) {
      return res.status(400).json({ message: "Email or phone already registered." });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      role,
      qualificationCategory,
      qualification,
      contactNumber,
      location,
    });

    await newUser.save();

    res.status(201).json({ message: "User created successfully", user: newUser });

    // ✅ Send Welcome Email (Branded for QJC) - do not block user creation
    sendWorkflowEmail(
      newUser.email,
      newUser.name,
      "Welcome to the Job Portal",
      `Welcome to the Qualification Based Job Finder System for Sri Lanka. Your account has been successfully created with the role: **${newUser.role}**.\n\nYou can now log in to update your educational qualifications and search for your ideal job.`
    ).catch((err) => console.error("Welcome email failed:", err));

    // ✅ Immediate Check for matching deadlines (Real-world scenario) - async notification only
    checkAndSendDeadlineAlert(newUser).catch((err) => console.error("Deadline alert failed:", err));
  } catch (error) {
    res.status(500).json({ message: "Error creating user", error: error.message });
  }
};

// ================== GET ALL USERS ==================
export const getUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password"); // hide password
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: "Error fetching users", error: error.message });
  }
};

// ================== GET SINGLE USER ==================
export const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: "Error fetching user", error: error.message });
  }
};

// ================== UPDATE USER ==================
export const updateUser = async (req, res) => {
  try {
    const { name, email, password, role, qualificationCategory, qualification, contactNumber, location } = req.body;

    let updatedData = { name, email, role, qualificationCategory, qualification, contactNumber, location };

    // If password provided, hash it
    if (password) {
      updatedData.password = await bcrypt.hash(password, 10);
    }

    const user = await User.findByIdAndUpdate(req.params.id, updatedData, { new: true }).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });

    // ✅ Send Update Email (Security Alert)
    await sendWorkflowEmail(
      user.email,
      user.name,
      "Security Alert: Profile Updated",
      "This is a notification from the Qualification Based Job Finder System. Your profile information was recently updated. If you did not perform this action, please contact the support team immediately."
    );

    // ✅ Trigger immediate deadline analysis after profile update
    if (qualification || qualificationCategory) {
       await checkAndSendDeadlineAlert(user);
    }

    res.status(200).json({ message: "User updated successfully", user });
  } catch (error) {
    res.status(500).json({ message: "Error updating user", error: error.message });
  }
};

// ================== DELETE USER ==================
export const deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting user", error: error.message });
  }
};
