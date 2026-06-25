import express from "express";
import {
  register,
  login,
  getAdmins,
  createAdmin,
  updateAdmin,
  deleteAdmin,
  verifyCompany,
  rejectCompany,
  suspendUser,
  deleteUserAccount,
  notifyAllUsers,
  updateUserAccountAdmin,
  updateCompanyAccountAdmin,
  deleteCompanyAccountAdmin,
  downloadCompanyDocument,
} from "../Controllers/adminController.js";

const router = express.Router();

// REGISTER route
router.post("/register", register);

// LOGIN route
router.post("/login", login);

// CRUD routes for Admins
router.get("/", getAdmins);
router.post("/", createAdmin);
router.put("/:id", updateAdmin);
router.delete("/:id", deleteAdmin);

// Company Verification & Override
router.put("/companies/:id/verify", verifyCompany);
router.put("/companies/:id/reject", rejectCompany);
router.put("/companies/:id/override", updateCompanyAccountAdmin);
router.delete("/companies/:id/delete", deleteCompanyAccountAdmin);
router.get("/companies/:id/document", downloadCompanyDocument);

// User Management & Override
router.put("/users/:id/suspend", suspendUser);
router.delete("/users/:id/delete", deleteUserAccount);
router.put("/users/:id/override", updateUserAccountAdmin);

// System Notifications
router.post("/broadcast", notifyAllUsers);

export default router;
