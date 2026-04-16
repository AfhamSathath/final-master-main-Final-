import express from "express";
import Company from "../models/Company.js";
import User from "../models/User.js";

const router = express.Router();

// ==================== SRI LANKAN COMPANY KEYWORDS ====================
const sriLankanKeywords = [
  "lanka",
  "ceylon",
  "serendib",
  "island",
  "colombo",
  "kandy",
  "galle",
  "jaffna",
  "traders",
  "holdings",
  "enterprises",
  "exports",
  "imports",
  "technologies",
  "solutions",
  "pvt ltd",
  "private limited",
  "group",
  "industries",
  "services",
  "foods",
  "apparels",
  "manufacturing",
];

// ==================== HELPER FUNCTIONS ====================
function containsSriLankanKeyword(name) {
  if (!name) return false;
  const lower = name.toLowerCase();
  return sriLankanKeywords.some((keyword) => lower.includes(keyword));
}

function detectRegistrationFormat(regNo) {
  if (!regNo) return false;
  const trimmed = regNo.trim();
  // ✅ Common Sri Lankan company registration formats (e.g. PV/12345/2020, BR/54321, etc.)
  const pattern = /^[A-Z]{1,4}\/\d{1,6}(\/\d{4})?$/i;
  return pattern.test(trimmed);
}

// ==================== VERIFY COMPANY ROUTE ====================
// POST /api/verify-company
// body: { companyName, regNumber?, email?, phone?, checkDuplicate? }
router.post("/", async (req, res) => {
  try {
    const { companyName, regNumber, email, phone, checkDuplicate } = req.body || {};

    if (!companyName || String(companyName).trim().length === 0) {
      return res.status(400).json({
        verified: false,
        confidence: 0,
        reason: "Company name is required",
      });
    }

    const name = String(companyName).trim();

    // STEP 1: Keyword check
    const keywordMatch = containsSriLankanKeyword(name);

    // STEP 2: Registration number format check (optional)
    const regMatch = detectRegistrationFormat(regNumber);

    // STEP 3: Combine verification logic
    let verified = false;
    let confidence = 0.2;
    let reason = "Unknown or invalid format.";

    if (keywordMatch && regMatch) {
      verified = true;
      confidence = 0.95;
      reason =
        "Company name and registration number match Sri Lankan business patterns.";
    } else if (keywordMatch) {
      verified = true;
      confidence = 0.75;
      reason = "Company name matches Sri Lankan business style (keyword found).";
    } else if (regMatch) {
      verified = true;
      confidence = 0.7;
      reason = "Registration number matches expected Sri Lankan format.";
    } else {
      verified = false;
      confidence = 0.2;
      reason =
        "No Sri Lankan business keywords or valid registration format found.";
    }

    // STEP 4: Check for duplicates (optional)
    if (checkDuplicate) {
      const companyQueryConditions = [];
      if (name && name.trim()) companyQueryConditions.push({ name: name.trim() });
      if (email && email.trim()) companyQueryConditions.push({ email: email.trim().toLowerCase() });
      if (regNumber && regNumber.trim()) companyQueryConditions.push({ regNumber: regNumber.trim() });
      if (phone && phone.trim()) companyQueryConditions.push({ contactNumber: phone.trim() });

      let existingCompany = null;
      if (companyQueryConditions.length > 0) {
        existingCompany = await Company.findOne({ $or: companyQueryConditions });
      }

      const userQueryConditions = [];
      if (email && email.trim()) userQueryConditions.push({ email: email.trim().toLowerCase() });
      if (phone && phone.trim()) userQueryConditions.push({ contactNumber: phone.trim() });

      let existingUser = null;
      if (userQueryConditions.length > 0) {
        existingUser = await User.findOne({ $or: userQueryConditions });
      }

      // Check exactly what is duplicated
      let duplicateField = "";
      if (existingCompany) {
        if (existingCompany.name === name.trim()) duplicateField = "Company Name";
        else if (existingCompany.email === email.trim().toLowerCase()) duplicateField = "Email Address";
        else if (existingCompany.regNumber === regNumber.trim()) duplicateField = "Registration Number";
        else if (existingCompany.contactNumber === phone.trim()) duplicateField = "Phone Number";
      } else if (existingUser) {
        if (existingUser.email === email.trim().toLowerCase()) duplicateField = "Email Address";
        else if (existingUser.contactNumber === phone.trim()) duplicateField = "Phone Number";
      }

      if (duplicateField) {
        return res.status(200).json({
          verified: false,
          confidence,
          duplicate: true,
          reason: `⚠️ This ${duplicateField} is already registered in our system. Please use unique details.`,
        });
      }
    }

    // ✅ Final response
    return res.json({
      verified,
      confidence,
      duplicate: false,
      reason,
    });
  } catch (err) {
    console.error("Verification error:", err);
    return res.status(500).json({
      verified: false,
      confidence: 0,
      reason: "Internal server error",
    });
  }
});

export default router;
