import User from "../models/User.js";
import Company from "../models/Company.js";
import Admin from "../models/admin.js";
import Notification from "../models/Notification.js";
import bcrypt from "bcryptjs";
import generateToken from "../src/utils/generateToken.js";
import { sendWorkflowEmail, sendCompanyVerificationAlert, sendAccountStatusAlert, sendProfileUpdatedAlert, sendAdminNewCompanyNotification, sendAdminOverrideAlert, sendDocumentAccessAlert } from "../src/utils/otpService.js";
import { emitNotification } from "../src/utils/socketManager.js";
import path from "path";
import fs from "fs";

// ================= REGISTER =================
export const register = async (req, res) => {
  try {
    const { name, email, password, role, contactNumber, location, regNumber } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: "Please provide all required fields" });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const existingUser = await User.findOne({ email: normalizedEmail });
    const existingCompany = await Company.findOne({ email: normalizedEmail });
    const existingAdmin = await Admin.findOne({ email: normalizedEmail });

    if (existingUser || existingCompany || existingAdmin) {
      return res.status(400).json({ message: "Account already exists with this email" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    let account;
    switch (role) {
      case "company":
        account = await Company.create({
          name,
          email: normalizedEmail,
          password: hashedPassword,
          role: "company",
          contactNumber,
          location,
          regNumber,
          verificationStatus: "pending"
        });
        break;
      case "admin":
        account = await Admin.create({
          name,
          email: normalizedEmail,
          password: hashedPassword,
          role: "admin",
        });
        break;
      default:
        account = await User.create({
          name,
          email: normalizedEmail,
          password: hashedPassword,
          role: "user",
          contactNumber,
          location
        });
        break;
    }

    await account.save();

    // ✅ Notify Admin if it's a new Company
    if (account.role === "company") {
      await sendAdminNewCompanyNotification({
        name: account.name,
        email: account.email,
        regNumber: account.regNumber,
        location: account.location
      }).catch(err => console.error("Failed to notify admin on admin reg:", err));
    }

    return res.status(201).json({
      _id: account._id,
      name: account.name,
      email: account.email,
      role: account.role,
      token: generateToken(account._id, account.role),
    });
  } catch (error) {
    console.error("Register error:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ================= LOGIN =================
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Please provide email and password" });
    }

    const normalizedEmail = email.toLowerCase().trim();

    let account = await User.findOne({ email: normalizedEmail });
    let role = "user";

    if (!account) {
      account = await Company.findOne({ email: normalizedEmail });
      role = "company";
    }

    if (!account) {
      account = await Admin.findOne({ email: normalizedEmail });
      role = "admin";
    }

    if (!account || !account.password) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, account.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    return res.json({
      _id: account._id,
      name: account.name,
      email: account.email,
      role,
      token: generateToken(account._id, role),
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// ================= ADMIN CRUD =================

// GET all admins
export const getAdmins = async (req, res) => {
  try {
    const admins = await Admin.find().select("-password"); // hide passwords
    res.status(200).json(admins);
  } catch (error) {
    console.error("Get Admins error:", error);
    res.status(500).json({ message: "Failed to fetch admins" });
  }
};

// CREATE new admin
export const createAdmin = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password)
      return res.status(400).json({ message: "All fields are required" });

    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin)
      return res.status(400).json({ message: "Admin already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newAdmin = await Admin.create({
      name,
      email,
      password: hashedPassword,
      role: "admin",
    });

    // ✅ Send Admin Creation Email (Branded for QJC)
    await sendWorkflowEmail(
      newAdmin.email,
      newAdmin.name,
      "Administrative Access Granted",
      `You have been appointed as an administrator for the Qualification Based Job Finder System. Your account has been successfully initialized.\n\nPlease log in to manage the system configurations, oversee qualifications, and manage users.`
    );

    res.status(201).json({
      _id: newAdmin._id,
      name: newAdmin.name,
      email: newAdmin.email,
      role: newAdmin.role,
    });
  } catch (error) {
    console.error("Create Admin error:", error);
    res.status(500).json({ message: "Failed to create admin" });
  }
};

// UPDATE admin
export const updateAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    if (updates.password) {
      updates.password = await bcrypt.hash(updates.password, 10);
    }

    const updatedAdmin = await Admin.findByIdAndUpdate(id, updates, { new: true }).select("-password");

    if (!updatedAdmin) return res.status(404).json({ message: "Admin not found" });

    // ✅ Send Admin Update Notification (Security Alert)
    await sendProfileUpdatedAlert(updatedAdmin.email, updatedAdmin.name, true);

    res.status(200).json(updatedAdmin);

  } catch (error) {
    console.error("Update Admin error:", error);
    res.status(500).json({ message: "Failed to update admin" });
  }
};

// DELETE admin
export const deleteAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedAdmin = await Admin.findByIdAndDelete(id);

    if (!deletedAdmin) return res.status(404).json({ message: "Admin not found" });

    res.status(200).json({ message: "Admin deleted successfully" });
  } catch (error) {
    console.error("Delete Admin error:", error);
    res.status(500).json({ message: "Failed to delete admin" });
  }
};

// ================= COMPANY VERIFICATION (ADMIN) =================

export const verifyCompany = async (req, res) => {
  try {
    const { id } = req.params;
    const company = await Company.findById(id);
    if (!company) return res.status(404).json({ message: "Company not found" });

    company.verificationStatus = "verified";
    await company.save();

    // ✅ Notify Company about Verification Success
    await sendCompanyVerificationAlert(company.email, company.name, "verified");

    res.status(200).json({ message: "Company verified successfully", company });
  } catch (error) {
    console.error("Verify Company error:", error);
    res.status(500).json({ message: "Failed to verify company" });
  }
};

export const rejectCompany = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const company = await Company.findById(id);
    if (!company) return res.status(404).json({ message: "Company not found" });

    company.verificationStatus = "rejected";
    company.rejectionReason = reason || "Documents provided were insufficient or invalid.";
    await company.save();

    // ✅ Notify Company about Rejection
    await sendCompanyVerificationAlert(company.email, company.name, "rejected", company.rejectionReason);

    res.status(200).json({ message: "Company rejected", company });
  } catch (error) {
    console.error("Reject Company error:", error);
    res.status(500).json({ message: "Failed to reject company" });
  }
};

export const downloadCompanyDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const company = await Company.findById(id);
    if (!company) return res.status(404).json({ message: "Company not found" });

    if (!company.documents || company.documents.length === 0) {
      return res.status(404).json({ message: "No documents found for this company" });
    }

    const documentName = company.documents[0]; // Assuming the first document is the BR
    const filePath = path.join(process.cwd(), "uploads", documentName);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: "Document file not found on server" });
    }

    // ✅ Send Document Access Alert (Email + Socket)
    await sendDocumentAccessAlert(company.email, company.name);

    res.download(filePath, documentName, (err) => {
      if (err) {
        console.error("File download error:", err);
      }
    });
  } catch (error) {
    console.error("Download Company Document error:", error);
    res.status(500).json({ message: "Failed to download document" });
  }
};

// ================= USER MANAGEMENT (ADMIN) =================

export const updateUserAccountAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, role, qualificationCategory, qualification, contactNumber, location, password } = req.body;

    let updatedData = { name, email, role, qualificationCategory, qualification, contactNumber, location };

    if (password) {
      updatedData.password = await bcrypt.hash(password, 10);
    }

    const user = await User.findByIdAndUpdate(id, updatedData, { new: true }).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });

    // ✅ Send Admin Override Alert (Email + Socket)
    await sendAdminOverrideAlert(user.email, user.name, "User", "UPDATE", "Your profile information or settings were updated by an administrator.");

    res.status(200).json({ message: "User updated successfully by admin", user });
  } catch (error) {
    console.error("Admin Update User error:", error);
    res.status(500).json({ message: "Failed to update user", error: error.message });
  }
};

export const updateCompanyAccountAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, location, email, contactNumber, regNumber, password, address } = req.body;

    const updatedData = { name, location, email, contactNumber, regNumber, address };
    if (password) updatedData.password = await bcrypt.hash(password, 10);

    const company = await Company.findByIdAndUpdate(id, updatedData, { new: true }).select("-password");
    if (!company) return res.status(404).json({ message: "Company not found" });

    // ✅ Send Admin Override Alert (Email + Socket)
    await sendAdminOverrideAlert(company.email, company.name, "Company", "UPDATE", "Your company profile information or settings were updated by an administrator.");

    res.status(200).json({ message: "Company updated successfully by admin", company });
  } catch (error) {
    console.error("Admin Update Company error:", error);
    res.status(500).json({ message: "Failed to update company", error: error.message });
  }
};

export const deleteCompanyAccountAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const company = await Company.findByIdAndDelete(id);
    if (!company) return res.status(404).json({ message: "Company not found" });

    // Notify company
    await sendAccountStatusAlert(company.email, company.name, "deleted");
    
    // Also emit a socket notification if possible (might not deliver if deleted, but attempt)
    emitNotification(company._id.toString(), {
      _id: "override-" + new Date().getTime(),
      userId: company._id,
      type: "system",
      title: "Account Deleted",
      message: "Your company account has been deleted by an administrator.",
      createdAt: new Date().toISOString(),
      read: false
    });

    res.status(200).json({ message: "Company deleted successfully by admin" });
  } catch (error) {
    console.error("Admin Delete Company error:", error);
    res.status(500).json({ message: "Failed to delete company", error: error.message });
  }
};

export const suspendUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.status = "suspended";
    await user.save();

    // ✅ Send Account Suspension Email
    await sendAccountStatusAlert(user.email, user.name, "suspended");
    
    // ✅ Send Real-time Socket Notification
    emitNotification(user._id.toString(), {
      _id: "override-" + new Date().getTime(),
      userId: user._id,
      type: "system",
      title: "Account Suspended",
      message: "Your account has been suspended by an administrator.",
      createdAt: new Date().toISOString(),
      read: false
    });

    res.status(200).json({ message: "User suspended", user });
  } catch (error) {
    console.error("Suspend User error:", error);
    res.status(500).json({ message: "Failed to suspend user" });
  }
};

export const deleteUserAccount = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByIdAndDelete(id);
    if (!user) return res.status(404).json({ message: "User not found" });

    // ✅ Send Account Deletion Email
    await sendAccountStatusAlert(user.email, user.name, "deleted");

    // ✅ Send Real-time Socket Notification
    emitNotification(user._id.toString(), {
      _id: "override-" + new Date().getTime(),
      userId: user._id,
      type: "system",
      title: "Account Deleted",
      message: "Your account has been deleted by an administrator.",
      createdAt: new Date().toISOString(),
      read: false
    });

    res.status(200).json({ message: "User deleted" });
  } catch (error) {
    console.error("Delete User error:", error);
    res.status(500).json({ message: "Failed to delete user" });
  }
};

export const notifyAllUsers = async (req, res) => {
    try {
      const { title, message } = req.body;
      if (!title || !message) {
        return res.status(400).json({ message: "Title and message are required" });
      }
  
      const users = await User.find({ role: "user" });
  
      const notifications = users.map(user => ({
        userId: user._id,
        type: "system",
        title,
        message,
        read: false,
      }));
  
      if (notifications.length > 0) {
        const savedNotifications = await Notification.insertMany(notifications);
        // ✅ Real-time Socket Broadcast
        savedNotifications.forEach(n => emitNotification(n.userId, n));
      }
  
      res.status(200).json({ message: "Broadcast sent to all users successfully" });
    } catch (error) {
      console.error("Notify All error:", error);
      res.status(500).json({ message: "Failed to send broadcast" });
    }
  };
