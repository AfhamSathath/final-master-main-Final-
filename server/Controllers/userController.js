import User from "../models/User.js";
import bcrypt from "bcryptjs";
import { sendWorkflowEmail } from "../src/utils/otpService.js";



// ================== CREATE USER ==================
export const createUser = async (req, res) => {
  try {

    const { name, email, password, role, qualificationCategory, qualification, contactNumber, location } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
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

    // ✅ Send Welcome Email (Branded for Exam System)
    await sendWorkflowEmail(
      newUser.email,
      newUser.name,
      "Welcome to the Job Portal",
      `Your account has been successfully created in the Job Portal - Creeer Lk Job Portalty of Applied Sciences, Creeer Lk Job Portal. Your role is set as **${newUser.role}**.\n\nYou can now log in to manage paper assignments and moderation workflows.`
    );


    res.status(201).json({ message: "User created successfully", user: newUser });

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
      "This is a notification from Creeer Lk Job Portal. Your profile information was recently updated. If you did not perform this action, please contact the Creeer Lk Job Portalty administrator immediately."
    );


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
