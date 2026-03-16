import Notification from "../models/Notification.js";
import User from "../models/User.js";
import Job from "../models/Job.js";
import Course from "../models/Course.js";

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
    const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

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

    const jobs = await Job.find({ closeDate: { $gte: now, $lte: in3Days } });
    const courses = await Course.find({ createdAt: { $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) } });

    const alertPromises = [];

    for (const job of jobs) {
      if (!isQualificationMatch(user, job.qualification, job.category)) continue;
      const exists = await Notification.exists({ userId, type: "job", referenceId: job._id });
      if (!exists) {
        alertPromises.push(
          Notification.create({
            userId,
            type: "job",
            title: `Job closing soon: ${job.title}`,
            message: `Deadline approaching for ${job.title} at ${job.company}. Closes on ${job.closeDate.toDateString()}.`,
            referenceId: job._id,
          })
        );
      }
    }

    for (const course of courses) {
      if (!isQualificationMatch(user, course.qualification, course.category)) continue;
      const exists = await Notification.exists({ userId, type: "course", referenceId: course._id });
      if (!exists) {
        alertPromises.push(
          Notification.create({
            userId,
            type: "course",
            title: `New course for your qualification: ${course.name}`,
            message: `New course at ${course.institution}: ${course.name}.`,
            referenceId: course._id,
          })
        );
      }
    }

    await Promise.all(alertPromises);

    const notifications = await Notification.find({ userId }).sort({ createdAt: -1 });
    return res.status(200).json({ notifications });
  } catch (error) {
    console.error("Error syncing near-deadline and recent alerts:", error);
    return res.status(500).json({ message: "Failed to sync notifications", error: error.message });
  }
};

const isQualificationMatch = (user, qualification, category) => {
  if (!user) return false;

  if (user.qualification && qualification && user.qualification.toLowerCase().trim() === qualification.toLowerCase().trim()) {
    return true;
  }

  if (user.qualificationCategory && category && user.qualificationCategory.toLowerCase().trim() === category.toLowerCase().trim()) {
    return true;
  }

  return false;
};
