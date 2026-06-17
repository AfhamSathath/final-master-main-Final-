// controllers/JobController.js
import Job from "../models/job.js";
import User from "../models/User.js";
import Admin from "../models/admin.js";
import Notification from "../models/Notification.js";
import Application from "../models/Application.js";
import nodemailer from "nodemailer";
import Company from "../models/Company.js";

import { sendWorkflowEmail, sendJobAlert, sendCompanyActionAlert, sendAlertEmail, sendClosingSoonScenarioAlert, sendJobStatusAlert } from "../src/utils/otpService.js";
import { emitNotification } from "../src/utils/socketManager.js";


// ================== CREATE JOB ==================
export const createJob = async (req, res) => {
  try {
    const {
      title,
      description,
      company,
      qualification,
      openDate,
      closeDate,
      category,
      positionType,
      paymentType,
      location,
    } = req.body;

    if (!title || !company || !openDate || !closeDate) {
      return res.status(400).json({ message: "Title, company, openDate, and closeDate are required." });
    }

    const newJob = new Job({
      title,
      description,
      company,
      qualification,
      openDate,
      closeDate,
      category,
      positionType: positionType || "full-time",
      paymentType: paymentType || "paid",
      location: location || "",
    });

    const savedJob = await newJob.save();

    // Notify admins and the company that a new job has been posted.
    const admins = await Admin.find({});
    await Promise.all(
      admins.map((admin) =>
        sendWorkflowEmail(
          admin.email,
          admin.name,
          "New Job Posted",
          `A new job has been posted:\n\n**Title:** ${title}\n**Company:** ${company}\n\nReview it in the admin panel if needed.`
        )
      )
    );

    const companyAccount = await Company.findOne({ name: company });
    if (companyAccount) {
      await sendCompanyActionAlert(companyAccount.email, companyAccount.name, "Job", "Created", title, openDate, closeDate);
    }

    res.status(201).json(savedJob);
  } catch (error) {
    res.status(500).json({ message: "Failed to create job", error: error.message });
  }
};

// ================== APPROVE JOB (ADMIN) ==================
export const approveJob = async (req, res) => {
  try {
    res.status(200).json({ message: "Job approval is no longer used. Jobs are visible immediately." });
  } catch (error) {
    res.status(500).json({ message: "Failed to approve job", error: error.message });
  }
};

// ================== REJECT JOB (ADMIN) ==================
export const rejectJob = async (req, res) => {
  try {
    res.status(200).json({ message: "Job rejection is no longer used. Jobs are visible immediately." });
  } catch (error) {
    res.status(500).json({ message: "Failed to reject job", error: error.message });
  }
};

// ================== GET ALL JOBS ==================
export const getJobs = async (req, res) => {
  try {
    const { search, positionType, paymentType, category, location } = req.query;

    const filter = {};
    if (positionType) filter.positionType = positionType;
    if (paymentType) filter.paymentType = paymentType;
    if (category) filter.category = category;
    if (location) filter.location = location;

    const queryParts = [];

    if (Object.keys(filter).length > 0) {
      queryParts.push(filter);
    }

    if (search) {
      const regex = new RegExp(search.toString(), "i");
      queryParts.push({
        $or: [
          { title: regex },
          { description: regex },
          { company: regex },
          { category: regex },
          { qualification: regex },
          { location: regex },
        ],
      });
    }

    const query = queryParts.length === 1 ? queryParts[0] : { $and: queryParts };
    const jobs = await Job.find(query).sort({ createdAt: -1 });
    res.status(200).json(jobs);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch jobs", error: error.message });
  }
};

// ================== GET SINGLE JOB ==================
export const getJobById = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ message: "Job not found" });
    res.status(200).json(job);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch job", error: error.message });
  }
};

// ================== UPDATE JOB ==================
export const updateJob = async (req, res) => {
  try {
    const updatedJob = await Job.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updatedJob) return res.status(404).json({ message: "Job not found" });

    // ✅ Notify matched users about the update
    const qualificationMatch = Array.isArray(updatedJob.qualification) ? updatedJob.qualification : (updatedJob.qualification ? [updatedJob.qualification] : []);
    const categoryMatch = updatedJob.category && updatedJob.category.trim();

    if (qualificationMatch.length > 0 || categoryMatch) {
      const query = { role: "user", $or: [] };
      if (qualificationMatch.length > 0) {
        const regexArray = qualificationMatch.map(q => new RegExp(`^${q.trim()}$`, "i"));
        query.$or.push({ qualification: { $in: regexArray } });
      }
      if (categoryMatch) query.$or.push({ qualificationCategory: { $regex: new RegExp(`^${categoryMatch}$`, "i") } });

      const matchedUsers = await User.find(query);

      const in5Days = new Date();
      in5Days.setDate(in5Days.getDate() + 5);
      const jobCloseDate = updatedJob.closeDate ? new Date(updatedJob.closeDate) : null;
      const isClosingSoon = jobCloseDate && jobCloseDate <= in5Days;

      // ✅ Create In-App Notifications for the update
      const notifications = matchedUsers.map((user) => ({
        userId: user._id,
        type: "job",
        title: isClosingSoon ? `⚠️ Update: Job closing soon - ${updatedJob.title}` : `🔄 Job Updated: ${updatedJob.title}`,
        message: isClosingSoon
          ? `Urgent update for ${updatedJob.title} at ${updatedJob.company}. Deadline is ${jobCloseDate.toDateString()}!`
          : `Some details for ${updatedJob.title} at ${updatedJob.company} have been updated.`,
        referenceId: updatedJob._id,
        read: false,
      }));

      if (notifications.length > 0) {
        const savedNotifs = await Notification.insertMany(notifications);
        // ✅ Real-time Socket Broadcast for Audio Alerts
        savedNotifs.forEach(n => emitNotification(n.userId, n));
      }

      await Promise.all(
        matchedUsers.filter(u => u.emailNotifications !== false).map((user) => {
          if (isClosingSoon) {
            return sendClosingSoonScenarioAlert(user.email, user.name, "Job Application", updatedJob.title, updatedJob.company, updatedJob.closeDate, true);
          } else {
            return sendJobAlert(user.email, user.name, "Updated", updatedJob.title, updatedJob.company, updatedJob.openDate, updatedJob.closeDate);
          }
        })
      );
    }

    // ✅ Notify the Company that Job was Updated
    const companyAccount = await Company.findOne({ name: updatedJob.company });
    if (companyAccount) {
      await sendCompanyActionAlert(companyAccount.email, companyAccount.name, "Job", "Updated", updatedJob.title, updatedJob.openDate, updatedJob.closeDate);
    }

    res.status(200).json(updatedJob);
  } catch (error) {
    res.status(500).json({ message: "Failed to update job", error: error.message });
  }
};

// ================== DELETE JOB ==================
export const deleteJob = async (req, res) => {
  try {
    const deletedJob = await Job.findByIdAndDelete(req.params.id);
    if (!deletedJob) return res.status(404).json({ message: "Job not found" });

    // Notify matched users that the job was removed
    const qualificationMatch = Array.isArray(deletedJob.qualification) ? deletedJob.qualification : (deletedJob.qualification ? [deletedJob.qualification] : []);
    const categoryMatch = deletedJob.category && deletedJob.category.trim();

    if (qualificationMatch.length > 0 || categoryMatch) {
      const query = { role: "user", $or: [] };
      if (qualificationMatch.length > 0) {
        const regexArray = qualificationMatch.map(q => new RegExp(`^${q.trim()}$`, "i"));
        query.$or.push({ qualification: { $in: regexArray } });
      }
      if (categoryMatch) query.$or.push({ qualificationCategory: { $regex: new RegExp(`^${categoryMatch}$`, "i") } });

      const matchedUsers = await User.find(query);
      await Promise.all(
        matchedUsers.filter(u => u.emailNotifications !== false).map((user) =>
          sendJobAlert(user.email, user.name, "Deleted", deletedJob.title, deletedJob.company, deletedJob.openDate, deletedJob.closeDate)
        )
      );
    }

    // ✅ Notify the Company that Job was Deleted
    const companyAccount = await Company.findOne({ name: deletedJob.company });
    if (companyAccount) {
      await sendCompanyActionAlert(companyAccount.email, companyAccount.name, "Job", "Deleted", deletedJob.title, deletedJob.openDate, deletedJob.closeDate);
    }

    // Remove stale notifications and applications related to this deleted job
    await Notification.deleteMany({ type: "job", referenceId: deletedJob._id });
    await Application.deleteMany({ jobId: deletedJob._id });

    res.status(200).json({ message: "Job deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete job", error: error.message });
  }
};

// ================== APPLY TO JOB ==================
export const applyToJob = async (req, res) => {
  try {
    if (req.user && req.user.role !== "user") {
      return res.status(403).json({ message: "Only registered job seekers can apply for jobs." });
    }

    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ message: "Job not found" });

    const user = await User.findById(req.user?.id || req.body.userId);
    if (!user) return res.status(404).json({ message: "User profile not found. Please log in as a job seeker." });

    // Check if already applied
    const existingApp = await Application.findOne({ jobId: job._id, userId: user._id });
    if (existingApp) {
      return res.status(400).json({ message: "You have already applied for this job." });
    }

    // Save Application record
    const application = new Application({
      jobId: job._id,
      userId: user._id,
      companyName: job.company,
      status: "pending",
    });
    await application.save();

    // Send confirmation email to the user
    if (user.emailNotifications !== false) {
      await sendWorkflowEmail(
        user.email,
        user.name,
        "Job Application Submitted Successfully",
        `You have successfully applied for the position of **${job.title}** at **${job.company}**.\n\nWe will notify you if your application is reviewed.`
      );
    }

    // Send notification to company
    const companyAccount = await Company.findOne({ name: job.company });
    if (companyAccount) {
      // Send an email to the company
      await sendWorkflowEmail(
        companyAccount.email,
        companyAccount.name,
        "New Job Application Received",
        `A candidate (${user.name}) has applied for the job listing **"${job.title}"**.\n\nYou can review their profile and qualifications on the platform.`
      );

      // Save notification and emit socket
      const notification = new Notification({
        userId: companyAccount._id,
        type: "job",
        title: "New Job Application",
        message: `Candidate ${user.name} has applied for "${job.title}".`,
        referenceId: job._id,
        read: false,
      });
      await notification.save();
      emitNotification(companyAccount._id, notification);
    }

    res.status(200).json({ message: "Applied successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to apply for job", error: error.message });
  }
};
