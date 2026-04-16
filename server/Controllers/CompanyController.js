import Company from "../models/Company.js";
import bcrypt from "bcryptjs";
import generateToken from "../src/utils/generateToken.js";
import { sendWorkflowEmail, sendAdminNewCompanyNotification, sendProfileUpdatedAlert } from "../src/utils/otpService.js";


import * as fs from "fs";
import path from "path";
import multer from "multer";
import crypto from "crypto";

// Robust import for Jimp to handle default vs named export across environments
import * as JimpPkg from "jimp";
const Jimp = (JimpPkg && JimpPkg.default) ? JimpPkg.default : JimpPkg;

// ================== UPLOAD DIR / MULTER CONFIGURATION ==================
const UPLOAD_DIR = path.join(process.cwd(), "uploads", "companies");
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const upload = multer({ dest: UPLOAD_DIR });

// ================== HELPER: COMPUTE IMAGE HASH (stable) ==================
// We resize + grayscale then compute a sha256 of the bitmap bytes.
// This avoids relying on Jimp's optional `hash()` method (not always available).
async function computeHash(filePath) {
  const image = await Jimp.read(filePath);
  // normalize size to reduce sensitivity to small differences
  image.resize(128, 128);
  image.grayscale();
  const buffer = image.bitmap.data; // Buffer/Uint8Array
  const hash = crypto.createHash("sha256").update(buffer).digest("hex");
  return hash;
}

// Safe file delete helper
function safeUnlink(filePath) {
  try {
    if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch (err) {
    // don't crash on cleanup errors; log for debugging
    console.warn("Failed to unlink file:", filePath, err && err.message);
  }
}

// ================== CREATE COMPANY ==================
export const createCompany = async (req, res) => {
  try {
    const { name, location, email, contactNumber, regNumber, password, address } = req.body;

    // basic required fields check
    if (!name || !email || !contactNumber || !regNumber || !password || !location) {
      if (req.files?.logo?.[0]?.path) safeUnlink(req.files.logo[0].path);
      if (req.files?.document?.[0]?.path) safeUnlink(req.files.document[0].path);
      return res.status(400).json({ message: "Please provide all required fields" });
    }

    const duplicateCompany = await Company.findOne({
      $or: [{ email }, { contactNumber }, { regNumber }, { name }],
    });

    if (duplicateCompany) {
      if (req.files?.logo?.[0]?.path) safeUnlink(req.files.logo[0].path);
      if (req.files?.document?.[0]?.path) safeUnlink(req.files.document[0].path);
      return res.status(400).json({
        message: "A company with this email, phone, registration number, or name already exists.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    let logoHash = null;
    let logoFile = null;
    let brDocument = null;

    // Process Logo
    if (req.files?.logo?.[0]) {
      const logo = req.files.logo[0];
      try {
        logoFile = logo.filename;
        logoHash = await computeHash(logo.path);
      } catch (err) {
        console.error("Error processing logo:", err);
      } finally {
        // Not safe-unlinking because the system seems to use these files (static serving)
        // Wait, the previous logic was unlinking after hash. 
        // If we want to serve the files, we shouldn't unlink.
        // Actually, let's keep it in the uploads folder.
      }
    }

    // Process BR Document
    if (req.files?.document?.[0]) {
      brDocument = req.files.document[0].filename;
    }

    const newCompany = new Company({
      name,
      location,
      address,
      email,
      contactNumber,
      regNumber,
      password: hashedPassword,
      logo: logoFile,
      logoHash,
      documents: brDocument ? [brDocument] : [],
      role: "company",
      verificationStatus: "pending",
    });

    await newCompany.save();

    // ✅ Send Confirmation Email
    await sendWorkflowEmail(
      newCompany.email,
      newCompany.name,
      "Account Created - Qualification Job Finder",
      `Your company account for **${newCompany.name}** has been successfully created. \n\n**Next Steps:** Your account is currently pending administrative verification. Our team will review your BR Certificate and registration number. You will receive an email once your account has been approved.`
    );

    // ✅ Notify Admin about New Company Registration
    await sendAdminNewCompanyNotification({
      name: newCompany.name,
      email: newCompany.email,
      regNumber: newCompany.regNumber,
      location: newCompany.location
    }).catch(err => console.error("Failed to notify admin:", err));

    res.status(201).json({
      message: "Company created successfully",
      company: {
        _id: newCompany._id,
        name: newCompany.name,
        email: newCompany.email,
        contactNumber: newCompany.contactNumber,
        regNumber: newCompany.regNumber,
        location: newCompany.location,
        role: newCompany.role,
        token: generateToken(newCompany._id, "company"),
      },
    });
  } catch (error) {
    console.error("Error creating company:", error);
    if (req.files?.logo?.[0]?.path) safeUnlink(req.files.logo[0].path);
    if (req.files?.document?.[0]?.path) safeUnlink(req.files.document[0].path);
    res.status(500).json({ message: "Error creating company", error: error.message });
  }
};

// ================== GET ALL COMPANIES ==================
export const getCompanies = async (req, res) => {
  try {
    const companies = await Company.find({ role: "company" }).select("-password");
    res.status(200).json(companies);
  } catch (error) {
    res.status(500).json({ message: "Error fetching companies", error: error.message });
  }
};

// ================== GET SINGLE COMPANY ==================
export const getCompanyById = async (req, res) => {
  try {
    const company = await Company.findById(req.params.id).select("-password");
    if (!company) return res.status(404).json({ message: "Company not found" });
    res.status(200).json(company);
  } catch (error) {
    res.status(500).json({ message: "Error fetching company", error: error.message });
  }
};

// ================== UPDATE COMPANY (ADMIN/GENERAL) ==================
export const updateCompany = async (req, res) => {
  try {
    const { name, location, email, contactNumber, regNumber, password, address } = req.body;

    const updatedData = {};
    if (name) updatedData.name = name;
    if (location) updatedData.location = location;
    if (email) updatedData.email = email;
    if (contactNumber) updatedData.contactNumber = contactNumber;
    if (regNumber) updatedData.regNumber = regNumber;
    if (address) updatedData.address = address;
    if (password) updatedData.password = await bcrypt.hash(password, 10);

    const company = await Company.findByIdAndUpdate(req.params.id, updatedData, {
      new: true,
    }).select("-password");

    if (!company) return res.status(404).json({ message: "Company not found" });

    // ✅ Send Update Notification (Security Alert)
    await sendProfileUpdatedAlert(company.email, company.name, true);


    res.status(200).json({ message: "Company updated successfully", company });

  } catch (error) {
    res.status(500).json({ message: "Error updating company", error: error.message });
  }
};

// ================== DELETE COMPANY (ADMIN/GENERAL) ==================
export const deleteCompany = async (req, res) => {
  try {
    const company = await Company.findByIdAndDelete(req.params.id);
    if (!company) return res.status(404).json({ message: "Company not found" });
    res.status(200).json({ message: "Company deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting company", error: error.message });
  }
};

// ================== GET LOGGED-IN COMPANY PROFILE ==================
export const getCompanyProfile = async (req, res) => {
  try {
    const company = await Company.findById(req.user.id).select("-password");
    if (!company) return res.status(404).json({ message: "Company not found" });
    res.status(200).json(company);
  } catch (error) {
    res.status(500).json({ message: "Error fetching company profile", error: error.message });
  }
};

// ================== UPDATE LOGGED-IN COMPANY ==================
export const updateMyCompany = async (req, res) => {
  try {
    const { name, location, email, contactNumber, regNumber, password, address } = req.body;

    const updatedData = {};
    if (name) updatedData.name = name;
    if (location) updatedData.location = location;
    if (email) updatedData.email = email;
    if (contactNumber) updatedData.contactNumber = contactNumber;
    if (regNumber) updatedData.regNumber = regNumber;
    if (address) updatedData.address = address;
    if (password) updatedData.password = await bcrypt.hash(password, 10);

    const company = await Company.findByIdAndUpdate(req.user.id, updatedData, {
      new: true,
    }).select("-password");

    if (!company) return res.status(404).json({ message: "Company not found" });

    // ✅ Send Security Notification
    await sendProfileUpdatedAlert(company.email, company.name, true);

    res.status(200).json({ message: "Company updated successfully", company });
  } catch (error) {
    res.status(500).json({ message: "Error updating company", error: error.message });
  }
};

// ================== DELETE LOGGED-IN COMPANY ==================
export const deleteMyCompany = async (req, res) => {
  try {
    const company = await Company.findByIdAndDelete(req.user.id);
    if (!company) return res.status(404).json({ message: "Company not found" });
    res.status(200).json({ message: "Company deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting company", error: error.message });
  }
};
