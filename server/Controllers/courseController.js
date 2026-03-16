// controllers/courseController.js
import Course from "../models/Course.js";
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

  // dev logger transport
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

// ================== CREATE COURSE ==================
export const createCourse = async (req, res) => {
  try {
    const {
      name,
      description,
      institution,
      qualification,
      duration,
      category,
      courseType,
      paymentType,
    } = req.body;

    if (!name || !institution) {
      return res.status(400).json({ error: "Name and institution are required" });
    }

    const newCourse = new Course({
      name,
      description,
      institution,
      qualification,
      duration,
      category,
      courseType: courseType || "full-time",
      paymentType: paymentType || "paid",
    });

    const savedCourse = await newCourse.save();

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
        type: "course",
        title: `New course: ${name}`,
        message: `New ${qualificationMatch} course available at ${institution}: ${name}.`,
        referenceId: savedCourse._id,
        read: false,
      }));

      if (notifications.length > 0) {
        await Notification.insertMany(notifications);
      }

      await Promise.all(
        matchedUsers.map((user) =>
          sendEmail(
            user.email,
            "New course alert on CareerLink LK",
            `Hi ${user.name},\n\nA new ${qualificationMatch} course is now available: ${name} at ${institution}.\nVisit the platform to learn more!`
          )
        )
      );
    }

    res.status(201).json(savedCourse);
  } catch (error) {
    console.error("❌ Error creating course:", error);
    res.status(500).json({ error: "Failed to create course" });
  }
};

// ================== GET ALL COURSES ==================
export const getCourses = async (req, res) => {
  try {
    const { search, courseType, paymentType, category } = req.query;

    const filter = {};
    if (courseType) filter.courseType = courseType;
    if (paymentType) filter.paymentType = paymentType;
    if (category) filter.category = category;

    if (search) {
      const regex = new RegExp(search.toString(), "i");
      filter.$or = [
        { name: regex },
        { description: regex },
        { institution: regex },
        { category: regex },
        { qualification: regex },
      ];
    }

    const courses = await Course.find(filter).sort({ createdAt: -1 });
    res.status(200).json(courses);
  } catch (error) {
    console.error("❌ Error fetching courses:", error);
    res.status(500).json({ error: "Failed to fetch courses" });
  }
};

// ================== GET COURSE BY ID ==================
export const getCourseById = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }
    res.status(200).json(course);
  } catch (error) {
    console.error("❌ Error fetching course by ID:", error);
    res.status(500).json({ error: "Failed to fetch course" });
  }
};

// ================== UPDATE COURSE ==================
export const updateCourse = async (req, res) => {
  try {
    const updatedCourse = await Course.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!updatedCourse) {
      return res.status(404).json({ error: "Course not found" });
    }

    res.status(200).json(updatedCourse);
  } catch (error) {
    console.error("❌ Error updating course:", error);
    res.status(500).json({ error: "Failed to update course" });
  }
};

// ================== DELETE COURSE ==================
export const deleteCourse = async (req, res) => {
  try {
    const deletedCourse = await Course.findByIdAndDelete(req.params.id);

    if (!deletedCourse) {
      return res.status(404).json({ error: "Course not found" });
    }

    // Remove associated notifications for the deleted course
    await Notification.deleteMany({ type: "course", referenceId: deletedCourse._id });

    res.status(200).json({ message: "✅ Course deleted successfully" });
  } catch (error) {
    console.error("❌ Error deleting course:", error);
    res.status(500).json({ error: "Failed to delete course" });
  }
};
