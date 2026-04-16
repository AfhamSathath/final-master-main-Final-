import express from "express";
import User from "../models/User.js";
import Company from "../models/Company.js";

const router = express.Router();

// ==================== CHECK DUPLICATES ====================
// POST /api/check-duplicate
// body: { userType?, name?, email?, phone?, regNumber? }
router.post("/", async (req, res) => {
  try {
    const { userType, name, email, phone, regNumber } = req.body || {};

    // Validate input
    if (!name && !email && !phone && !regNumber) {
      return res.status(400).json({
        exists: false,
        message:
          "At least one of name, email, phone, or regNumber is required.",
      });
    }

    // Prepare queries for User and Company collections
    const userQuery = [];
    if (email && email.trim()) userQuery.push({ email: email.trim().toLowerCase() });
    if (phone && phone.trim()) userQuery.push({ contactNumber: phone.trim() });

    const companyQuery = [];
    if (userType === "company" && name && name.trim()) companyQuery.push({ name: name.trim() });
    if (email && email.trim()) companyQuery.push({ email: email.trim().toLowerCase() });
    if (phone && phone.trim()) companyQuery.push({ contactNumber: phone.trim() });
    if (userType === "company" && regNumber && regNumber.trim()) companyQuery.push({ regNumber: regNumber.trim() });

    // Run queries only if fields exist
    const userExists = userQuery.length > 0 ? await User.findOne({ $or: userQuery }) : null;
    const companyExists = companyQuery.length > 0 ? await Company.findOne({ $or: companyQuery }) : null;

    // Identify exactly what exists
    let duplicateField = "";
    if (userExists) {
      if (userExists.email === email?.trim().toLowerCase()) duplicateField = "Email Address";
      else if (userExists.contactNumber === phone?.trim()) duplicateField = "Phone Number";
    } else if (companyExists) {
      if (companyExists.name === name?.trim()) duplicateField = "Company Name";
      else if (companyExists.email === email?.trim().toLowerCase()) duplicateField = "Email Address";
      else if (companyExists.contactNumber === phone?.trim()) duplicateField = "Phone Number";
      else if (companyExists.regNumber === regNumber?.trim()) duplicateField = "Registration Number";
    }

    if (duplicateField) {
      return res.json({
        exists: true,
        message: `⚠️ This ${duplicateField} is already in use. Please use unique details.`,
      });
    }

    // No duplicates
    return res.json({
      exists: false,
      message: "No duplicates found.",
    });
  } catch (err) {
    console.error("Duplicate check error:", err);
    return res.status(500).json({
      exists: false,
      message: "Internal server error.",
    });
  }
});

export default router;
