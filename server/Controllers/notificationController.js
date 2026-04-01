import Notification from "../models/Notification.js";
import User from "../models/User.js";
import Job from "../models/job.js";
import Course from "../models/Course.js";
import { sendAlertEmail } from "../src/utils/otpService.js";
import { emitNotification } from "../src/utils/socketManager.js";

const getUserId = (req) => req.user?.id || req.query.userId || req.params.userId;

export const getNotificationsForUser = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(400).json({ message: "userId is required" });
    }

    const notifications = await Notification.find({ userId }).sort({ createdAt: -1 });
    return res.status(200).json({ notifications });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return res.status(500).json({ message: "Failed to fetch notifications", error: error.message });
  }
};

export const markNotificationRead = async (req, res) => {
  try {
    const { id } = req.params;
    const notification = await Notification.findByIdAndDelete(id);
    if (!notification) return res.status(404).json({ message: "Notification not found" });
    return res.status(200).json({ message: "Notification deleted (read)", notification });
  } catch (error) {
    console.error("Error deleting notification:", error);
    return res.status(500).json({ message: "Failed to remove notification", error: error.message });
  }
};

export const getUnreadCount = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(400).json({ message: "userId is required" });
    }

    const count = await Notification.countDocuments({ userId, read: false });
    return res.status(200).json({ count });
  } catch (error) {
    console.error("Error fetching unread count:", error);
    return res.status(500).json({ message: "Failed to fetch unread notifications", error: error.message });
  }
};

export const syncNearDeadlineAndRecentAlerts = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(400).json({ message: "userId is required" });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.role !== "user") return res.status(403).json({ message: "Only user roles are synced" });

    const now = new Date();
    const in5Days = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);

    // Automatically remove notifications for jobs/courses that are closed.
    const expiredJobs = await Job.find({ closeDate: { $lt: now } }).select("_id");
    const expiredJobIds = expiredJobs.map((job) => job._id);
    if (expiredJobIds.length > 0) {
      await Notification.deleteMany({ userId, type: "job", referenceId: { $in: expiredJobIds } });
    }

    // Course may have a closeDate if added later; also remove stale course alerts older than 90 days.
    const expiredCoursesByDate = await Course.find({ closeDate: { $lt: now } }).select("_id");
    const expiredCoursesByAge = await Course.find({ createdAt: { $lt: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000) } }).select("_id");
    const expiredCourseIds = Array.from(
      new Set([...expiredCoursesByDate.map((course) => course._id.toString()), ...expiredCoursesByAge.map((course) => course._id.toString())])
    );
    if (expiredCourseIds.length > 0) {
      await Notification.deleteMany({ userId, type: "course", referenceId: { $in: expiredCourseIds } });
    }

    const deadlineJobs = await Job.find({ closeDate: { $gte: now, $lte: in5Days } });
    const deadlineCourses = await Course.find({ closeDate: { $gte: now, $lte: in5Days } });

    const alertPromises = [];

    for (const job of deadlineJobs) {
      if (!isQualificationMatch(user, job.qualification, job.category)) continue;
      const exists = await Notification.exists({ userId, type: "job", referenceId: job._id });
      if (!exists) {
        const oDate = job.openDate ? new Date(job.openDate).toDateString() : "Not Specified";
        const cDate = job.closeDate ? new Date(job.closeDate).toDateString() : "Not Specified";
        const emailMsg = `Deadline approaching for ${job.title} at ${job.company}.\n\n**Opening Date:** ${oDate}\n**Closing Date:** ${cDate}\n\nLog in to your dashboard to review details.`;

        alertPromises.push(
          Notification.create({
            userId,
            type: "job",
            title: `Job closing soon: ${job.title}`,
            message: `Deadline approaching for ${job.title} at ${job.company}. Closes on ${cDate}.`,
            referenceId: job._id,
          })
        );
        
        sendAlertEmail(user.email, user.name, `⏰ Job closing soon: ${job.title}`, emailMsg).catch(console.error);
      }
    }

    for (const course of deadlineCourses) {
      if (!isQualificationMatch(user, course.qualification, course.category)) continue;
      const exists = await Notification.exists({ userId, type: "course", referenceId: course._id });
      if (!exists) {
        const cDate = course.closeDate ? new Date(course.closeDate).toDateString() : "Not Specified";
        const emailMsg = `Deadline approaching for course: ${course.name} at ${course.institution}.\n\n**Enrollment Deadline:** ${cDate}\n\nLog in to your dashboard to enroll before spots fill up.`;

        alertPromises.push(
          Notification.create({
            userId,
            type: "course",
            title: `Course closing soon: ${course.name}`,
            message: `Deadline approaching for ${course.name} at ${course.institution}. Closes on ${cDate}.`,
            referenceId: course._id,
          })
        );
        
        sendAlertEmail(user.email, user.name, `⏰ Course closing soon: ${course.name}`, emailMsg).catch(console.error);
      }
    }

    const createdNotifications = await Promise.all(alertPromises);
    // ✅ Broadcast real-time Socket notifications for Audio alerts
    createdNotifications.forEach(n => {
      if (n) emitNotification(userId, n);
    });

    const notifications = await Notification.find({ userId }).sort({ createdAt: -1 });
    return res.status(200).json({ notifications });
  } catch (error) {
    console.error("Error syncing near-deadline and recent alerts:", error);
    return res.status(500).json({ message: "Failed to sync notifications", error: error.message });
  }
};

const isQualificationMatch = (user, qualification, category) => {
  if (!user) return false;

  if (user.qualification && qualification) {
    if (Array.isArray(qualification)) {
      if (qualification.some(q => q.toLowerCase().trim() === user.qualification.toLowerCase().trim())) {
        return true;
      }
    } else if (user.qualification.toLowerCase().trim() === qualification.toLowerCase().trim()) {
      return true;
    }
  }

  if (user.qualificationCategory && category && user.qualificationCategory.toLowerCase().trim() === category.toLowerCase().trim()) {
    return true;
  }

  return false;
};
