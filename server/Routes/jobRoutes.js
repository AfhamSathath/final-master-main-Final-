// routes/JobRoutes.js
import express from "express";
import {
  createJob,
  getJobs,
  getJobById,
  updateJob,
  deleteJob,
  approveJob,
  rejectJob,
  applyToJob,
} from "../controllers/JobController.js";
import optionalAuthMiddleware from "../src/middlewares/optionalAuthMiddleware.js";
import authMiddleware from "../src/middlewares/authMiddleware.js";

const router = express.Router();

// CRUD Routes
router.post("/", createJob);          // Create job
router.get("/", optionalAuthMiddleware, getJobs);             // Get all jobs
router.get("/:id", getJobById);       // Get single job by ID
router.put("/:id", updateJob);        // Update job by ID
router.delete("/:id", deleteJob);     // Delete job by ID
router.post("/:id/apply", authMiddleware, applyToJob); // Apply for job

// Admin Approval Routes
router.put("/:id/approve", approveJob);
router.put("/:id/reject", rejectJob);

export default router;
