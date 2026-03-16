// controllers/JobController.js
import Job from "../models/Job.js";
import User from "../models/User.js";
import Notification from "../models/Notification.js";
import nodemailer from "nodemailer";

const getEmailTransporter = () => {
  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    return nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }

  return {
    sendMail: async (options) => {
      console.log("[DEV EMAIL] To:", options.to);
      console.log("[DEV EMAIL] Subject:", options.subject);
      console.log("[DEV EMAIL] Text:", options.text);
      return Promise.resolve({ messageId: "dev-email" });
    },
  };
};

const sendEmail = async (to, subject, text) => {
  try {
    const transporter = getEmailTransporter();
    await transporter.sendMail({
      from: process.env.EMAIL_USER || "noreply@careerlink.lk",
      to,
      subject,
      text,
    });
  } catch (err) {
    console.warn("Failed to send email notification (continuing):", err.message);
  }
};

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
    });

    const savedJob = await newJob.save();

    const qualificationMatch = qualification && qualification.trim();
    if (qualificationMatch) {
      const matchedUsers = await User.find({
        role: "user",
        $or: [
          { qualification: { $regex: new RegExp(`^${qualificationMatch}$`, "i") } },
          { qualificationCategory: { $regex: new RegExp(`^${category}$`, "i") } },
        ],
      });

      const notifications = matchedUsers.map((user) => ({
        userId: user._id,
        type: "job",
        title: `New job: ${title}`,
        message: `New ${qualificationMatch} job opening at ${company}: ${title}.`,
        referenceId: savedJob._id,
        read: false,
      }));

      if (notifications.length > 0) {
        await Notification.insertMany(notifications);
      }

      await Promise.all(
        matchedUsers.map((user) =>
          sendEmail(
            user.email,
            "New job alert on CareerLink LK",
            `Hi ${user.name},\n\nA new ${qualificationMatch} job is now open at ${company}: ${title}.\nVisit the platform to apply!`
          )
        )
      );
    }

    res.status(201).json(savedJob);
  } catch (error) {
    res.status(500).json({ message: "Failed to create job", error: error.message });
  }
};

// ================== GET ALL JOBS ==================
export const getJobs = async (req, res) => {
  try {
    const { search, positionType, paymentType, category } = req.query;

    const filter = {};
    if (positionType) filter.positionType = positionType;
    if (paymentType) filter.paymentType = paymentType;
    if (category) filter.category = category;

    if (search) {
      const regex = new RegExp(search.toString(), "i");
      filter.$or = [
        { title: regex },
        { description: regex },
        { company: regex },
        { category: regex },
        { qualification: regex },
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

    // Remove stale notifications related to this deleted job
    await Notification.deleteMany({ type: "job", referenceId: deletedJob._id });

    res.status(200).json({ message: "Job deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete job", error: error.message });
  }
};
