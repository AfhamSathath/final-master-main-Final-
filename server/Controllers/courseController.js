// controllers/courseController.js
import Course from "../models/Course.js";
import User from "../models/User.js";
import Admin from "../models/admin.js";
import Notification from "../models/Notification.js";
import nodemailer from "nodemailer";
import Company from "../models/Company.js";

import { sendWorkflowEmail, sendCourseAlert, sendCompanyActionAlert, sendAlertEmail, sendClosingSoonScenarioAlert } from "../src/utils/otpService.js";
import { emitNotification } from "../src/utils/socketManager.js";


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
      location,
      closeDate,
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
      location: location || "",
      closeDate,
    });

    const savedCourse = await newCourse.save();

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
      const courseCloseDate = closeDate ? new Date(closeDate) : null;
      const isClosingSoon = courseCloseDate && courseCloseDate <= in5Days;

      const notifications = matchedUsers.map((user) => ({
        userId: user._id,
        type: "course",
        title: isClosingSoon ? `Course closing soon: ${name}` : `🎓 New Course Alert: ${name}`,
        message: isClosingSoon 
          ? `Deadline approaching for ${name} at ${institution}. Closes on ${courseCloseDate.toDateString()}.`
          : `New ${qualificationMatch.join(', ')} course available at ${institution}: ${name}. Enrollment closes on ${courseCloseDate ? courseCloseDate.toLocaleDateString() : 'N/A'}.`,
        referenceId: savedCourse._id,
        read: false,
      }));

      if (notifications.length > 0) {
        const savedNotifications = await Notification.insertMany(notifications);
        // ✅ Real-time Socket Broadcast for Audio Alerts & Updates
        savedNotifications.forEach(n => emitNotification(n.userId, n));
      }

      await Promise.all(
        matchedUsers.map((user) => {
            if (isClosingSoon) {
               return sendClosingSoonScenarioAlert(user.email, user.name, "Course Enrollment", name, institution, closeDate);
            } else {
               return sendCourseAlert(user.email, user.name, "Created", name, institution, closeDate);
            }
        })
      );

      // ✅ Notify Admins about the new course posting
      const admins = await Admin.find({});
      await Promise.all(
        admins.map((admin) =>
          sendWorkflowEmail(
            admin.email,
            admin.name,
            "New Education Module Alert",
            `A new course has been posted on the platform:\n\n**Name:** ${name}\n**Institution:** ${institution}\n**Category:** ${category}\n\nPlease review the posting in the admin panel.`
          )
        )
      );
    }

    // ✅ Notify the Company/Institution that Course was Created
    let institutionAccount = await Company.findOne({ name: institution });
    if (!institutionAccount) institutionAccount = await Admin.findOne({ name: institution });
    if (institutionAccount) {
      await sendCompanyActionAlert(institutionAccount.email, institutionAccount.name, "Course", "Created", name, null, closeDate);
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
    const { search, courseType, paymentType, category, location } = req.query;

    const filter = {};
    if (courseType) filter.courseType = courseType;
    if (paymentType) filter.paymentType = paymentType;
    if (category) filter.category = category;
    if (location) filter.location = location;

    if (search) {
      const regex = new RegExp(search.toString(), "i");
      filter.$or = [
        { name: regex },
        { description: regex },
        { institution: regex },
        { category: regex },
        { qualification: regex },
        { location: regex },
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

    // Notify matched users about the update
    const qualificationMatch = Array.isArray(updatedCourse.qualification) ? updatedCourse.qualification : (updatedCourse.qualification ? [updatedCourse.qualification] : []);
    const categoryMatch = updatedCourse.category && updatedCourse.category.trim();

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
      const courseCloseDate = updatedCourse.closeDate ? new Date(updatedCourse.closeDate) : null;
      const isClosingSoon = courseCloseDate && courseCloseDate <= in5Days;

      // ✅ Create In-App Notifications for the update
      const notifications = matchedUsers.map((user) => ({
        userId: user._id,
        type: "course",
        title: isClosingSoon ? `⚠️ Update: Course closing soon - ${updatedCourse.name}` : `🎓 Course Updated: ${updatedCourse.name}`,
        message: isClosingSoon 
          ? `Urgent update for ${updatedCourse.name} at ${updatedCourse.institution}. Enrollment ends ${courseCloseDate.toDateString()}!`
          : `Details for ${updatedCourse.name} at ${updatedCourse.institution} have been updated.`,
        referenceId: updatedCourse._id,
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
            return sendClosingSoonScenarioAlert(user.email, user.name, "Course Enrollment", updatedCourse.name, updatedCourse.institution, updatedCourse.closeDate, true);
          } else {
            return sendCourseAlert(user.email, user.name, "Updated", updatedCourse.name, updatedCourse.institution, updatedCourse.closeDate);
          }
        })
      );
    }

    // ✅ Notify the Company/Institution that Course was Updated
    let institutionAccount = await Company.findOne({ name: updatedCourse.institution });
    if (!institutionAccount) institutionAccount = await Admin.findOne({ name: updatedCourse.institution });
    if (institutionAccount) {
      await sendCompanyActionAlert(institutionAccount.email, institutionAccount.name, "Course", "Updated", updatedCourse.name, null, updatedCourse.closeDate);
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

    // Notify matched users that the course was removed
    const qualificationMatch = Array.isArray(deletedCourse.qualification) ? deletedCourse.qualification : (deletedCourse.qualification ? [deletedCourse.qualification] : []);
    const categoryMatch = deletedCourse.category && deletedCourse.category.trim();

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
          sendCourseAlert(user.email, user.name, "Deleted", deletedCourse.name, deletedCourse.institution, deletedCourse.closeDate)
        )
      );
    }

    // ✅ Notify the Company/Institution that Course was Deleted
    let institutionAccount = await Company.findOne({ name: deletedCourse.institution });
    if (!institutionAccount) institutionAccount = await Admin.findOne({ name: deletedCourse.institution });
    if (institutionAccount) {
      await sendCompanyActionAlert(institutionAccount.email, institutionAccount.name, "Course", "Deleted", deletedCourse.name, null, deletedCourse.closeDate);
    }

    // Remove associated notifications for the deleted course
    await Notification.deleteMany({ type: "course", referenceId: deletedCourse._id });

    res.status(200).json({ message: "✅ Course deleted successfully" });
  } catch (error) {
    console.error("❌ Error deleting course:", error);
    res.status(500).json({ error: "Failed to delete course" });
  }
};
