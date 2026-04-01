// controllers/JobController.js
import Job from "../models/job.js";
import User from "../models/User.js";
import Admin from "../models/admin.js";
import Notification from "../models/Notification.js";
import nodemailer from "nodemailer";
import Company from "../models/Company.js";

import { sendWorkflowEmail, sendJobAlert, sendCompanyActionAlert, sendAlertEmail, sendClosingSoonScenarioAlert } from "../src/utils/otpService.js";
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

    const qualificationMatch = Array.isArray(qualification) ? qualification : (qualification ? [qualification] : []);
    const categoryMatch = category && category.trim();

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
      const jobCloseDate = closeDate ? new Date(closeDate) : null;
      const isClosingSoon = jobCloseDate && jobCloseDate <= in5Days;

      // Create In-App Notifications
      const notifications = matchedUsers.map((user) => ({
        userId: user._id,
        type: "job",
        title: isClosingSoon ? `Job closing soon: ${title}` : `🚀 New Job Opportunity: ${title}`,
        message: isClosingSoon
          ? `Deadline approaching for ${title} at ${company}. Closes on ${jobCloseDate.toDateString()}.`
          : `A new ${qualificationMatch.join(', ')} job opening at ${company} is now available.`,
        referenceId: savedJob._id,
        read: false,
      }));

      if (notifications.length > 0) {
        const savedNotifications = await Notification.insertMany(notifications);
        // ✅ Real-time Socket Broadcast for Audio Alerts & Updates
        savedNotifications.forEach(n => emitNotification(n.userId, n));
      }

      // ✅ Send specialized Job Alert to all matched users
      await Promise.all(
        matchedUsers.map((user) => {
          if (isClosingSoon) {
            return sendClosingSoonScenarioAlert(user.email, user.name, "Job Application", title, company, closeDate);
          } else {
            return sendJobAlert(user.email, user.name, "Created", title, company, openDate, closeDate);
          }
        })
      );

      // ✅ Notify Admins about the new job posting
      const admins = await Admin.find({});
      await Promise.all(
        admins.map((admin) =>
          sendWorkflowEmail(
            admin.email,
            admin.name,
            "New Job Posting Alert",
            `A new job has been posted on the platform:\n\n**Title:** ${title}\n**Company:** ${company}\n**Posted By:** ${req.user ? req.user.name : 'System Admin'}\n\nPlease review the posting in the admin panel.`
          )
        )
      );
    }

    // ✅ Notify the Company that Job was Created
    const companyAccount = await Company.findOne({ name: company });
    if (companyAccount) {
      await sendCompanyActionAlert(companyAccount.email, companyAccount.name, "Job", "Created", title, openDate, closeDate);
    }

    res.status(201).json(savedJob);
  } catch (error) {
    res.status(500).json({ message: "Failed to create job", error: error.message });
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

    if (search) {
      const regex = new RegExp(search.toString(), "i");
      filter.$or = [
        { title: regex },
        { description: regex },
        { company: regex },
        { category: regex },
        { qualification: regex },
        { location: regex },
      ];
    }

    const jobs = await Job.find(filter).sort({ createdAt: -1 });
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
        matchedUsers.map((user) => {
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
        matchedUsers.map((user) =>
          sendJobAlert(user.email, user.name, "Deleted", deletedJob.title, deletedJob.company, deletedJob.openDate, deletedJob.closeDate)
        )
      );
    }

    // ✅ Notify the Company that Job was Deleted
    const companyAccount = await Company.findOne({ name: deletedJob.company });
    if (companyAccount) {
      await sendCompanyActionAlert(companyAccount.email, companyAccount.name, "Job", "Deleted", deletedJob.title, deletedJob.openDate, deletedJob.closeDate);
    }

    // Remove stale notifications related to this deleted job
    await Notification.deleteMany({ type: "job", referenceId: deletedJob._id });

    res.status(200).json({ message: "Job deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete job", error: error.message });
  }
};
