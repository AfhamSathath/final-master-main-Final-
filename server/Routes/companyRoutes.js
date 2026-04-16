import express from "express";
import {
  getCompanies,
  getCompanyById,
  createCompany,
  updateCompany,
  deleteCompany,
  getCompanyProfile,
  updateMyCompany,
  deleteMyCompany,
} from "../Controllers/CompanyController.js";
import authMiddleware from "../src/middlewares/authMiddleware.js";
import upload from "../src/utils/multerMiddleware.js";

const router = express.Router();

// CRUD routes
router.post("/", upload.fields([
  { name: "logo", maxCount: 1 },
  { name: "document", maxCount: 1 }
]), createCompany);
router.get("/", getCompanies);
router.get("/:id", getCompanyById);
router.put("/:id", updateCompany);
router.delete("/:id", deleteCompany);

// Profile routes (for logged-in company)
router.get("/me/profile", authMiddleware, getCompanyProfile);
router.put("/me/profile", authMiddleware, updateMyCompany);
router.delete("/me/profile", authMiddleware, deleteMyCompany);

export default router;
