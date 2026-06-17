import express from "express";
import {
  createUser,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  unsubscribeFromEmails,
  subscribeToEmails,
} from "../Controllers/userController.js";

const router = express.Router();

// CRUD Routes
router.post("/", createUser);        // Create user
router.get("/", getUsers);           // Get all users
router.get("/:id", getUserById);     // Get single user
router.put("/:id", updateUser);      // Update user
router.delete("/:id", deleteUser);   // Delete user
router.put("/:id/unsubscribe", unsubscribeFromEmails); // Unsubscribe from emails
router.put("/:id/subscribe", subscribeToEmails);     // Subscribe to emails

export default router;
