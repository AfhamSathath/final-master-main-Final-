import Job from "../../models/Job.js";
import Course from "../../models/Course.js";
import User from "../../models/User.js";
import Notification from "../../models/Notification.js";
import { sendWorkflowEmail, sendDeadlineAlertEmail, sendAlertEmail } from "./otpService.js";
/**
 * Service to calculate and send deadline alerts for a particular user.
 * Aligned with QJC brand.
 * 
 * @param {Object} user - User document instance.
 * @param {number} daysWindow - Lookahead window in days (default 3).
 * @returns {Promise<Object|null>} - Returns count of items found, or null if nothing sent.
 */
export const checkAndSendDeadlineAlert = async (user, daysWindow = 3) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const targetDate = new Date();
        targetDate.setDate(today.getDate() + daysWindow);
        targetDate.setHours(23, 59, 59, 999);

        const userQual = user.qualification ? user.qualification.trim() : null;
        const userCat = user.qualificationCategory ? user.qualificationCategory.trim() : null;

        // Skip users without profile data
        if (!userQual && !userCat) return null;

        const matchingCriteria = [];
        if (userQual) matchingCriteria.push({ qualification: { $regex: new RegExp(`^${userQual}$`, "i") } });
        if (userCat) matchingCriteria.push({ category: { $regex: new RegExp(`^${userCat}$`, "i") } });

        // Find matching jobs with upcoming deadlines
        const jobs = await Job.find({
            $or: matchingCriteria,
            closeDate: { $gte: today, $lte: targetDate }
        });

        // Find matching courses with upcoming deadlines
        const courses = await Course.find({
            $or: matchingCriteria,
            closeDate: { $gte: today, $lte: targetDate }
        });

        // Nothing to alert
        if (jobs.length === 0 && courses.length === 0) return null;

        let message = `We found several opportunities matching your profile that are closing soon. Don't miss out!<br><br>`;

        if (jobs.length > 0) {
            message += `**💼 Upcoming Job Deadlines:**<br><br>`;
            jobs.forEach(job => {
                const diff = Math.ceil((new Date(job.closeDate) - today) / (1000 * 60 * 60 * 24));
                const timeStr = diff === 0 ? "Today" : diff === 1 ? "Tomorrow" : `in ${diff} days`;
                const oDate = job.openDate ? new Date(job.openDate).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : "Not Specified";
                const cDate = job.closeDate ? new Date(job.closeDate).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : "Not Specified";
                
                message += `• **${job.title}** at **${job.company}**<br>`;
                message += `&nbsp;&nbsp;**Opening Date:** ${oDate}<br>`;
                message += `&nbsp;&nbsp;**Closing Date:** ${cDate} *(Ends ${timeStr})*<br><br>`;
            });
        }

        if (courses.length > 0) {
            message += `**🎓 Upcoming Course Deadlines:**<br><br>`;
            courses.forEach(course => {
                const d = course.closeDate ? new Date(course.closeDate) : null;
                const cDate = d ? d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : "Not Specified";
                
                if (d) {
                    const diff = Math.ceil((d - today) / (1000 * 60 * 60 * 24));
                    const timeStr = diff === 0 ? "Today" : diff === 1 ? "Tomorrow" : `in ${diff} days`;
                    message += `• **${course.name}** at **${course.institution}**<br>`;
                    message += `&nbsp;&nbsp;**Enrollment Deadline:** ${cDate} *(Ends ${timeStr})*<br><br>`;
                } else {
                    message += `• **${course.name}** at **${course.institution}**<br>`;
                    message += `&nbsp;&nbsp;**Enrollment Deadline:** Closing soon<br><br>`;
                }
            });
        }

        message += `Log in to the platform soon to view details and apply before the deadline!`;

        // Send High-Priority Email via QJC Service
        await sendDeadlineAlertEmail(
            user.email,
            user.name,
            message
        );

        // Record persistent in-app notification
        await Notification.create({
            userId: user._id,
            type: jobs.length > 0 ? "job" : "course",
            title: "⏰ Upcoming Deadlines Alert",
            message: `You have ${jobs.length + courses.length} matching opportunities closing within the next ${daysWindow} days. Check your email for details.`,
            read: false
        });

        return { jobs: jobs.length, courses: courses.length };
    } catch (error) {
        console.error(`❌ [DeadlineAlert] Critical error for ${user.email}:`, error);
        throw error;
    }
};

/**
 * Run bulk analysis for all eligible users.
 */
export const runBulkDeadlineAlert = async () => {
    try {
        const users = await User.find({ role: "user" });
        console.log(`📡 [DeadlineAlert] Starting analysis for ${users.length} users...`);
        
        let counter = 0;
        for (const user of users) {
             const result = await checkAndSendDeadlineAlert(user);
             if (result) counter++;
        }
        
        console.log(`✅ [DeadlineAlert] Completed. Sent ${counter} alerts.`);
        return counter;
    } catch (error) {
        console.error("❌ [DeadlineAlert] Bulk analysis failed:", error);
    }
};

/**
 * Send a daily digest of new/deadline jobs and courses.
 */
export const sendDailyNewsDigest = async (user) => {
    try {
        if (user.role !== "user") return null;

        const today = new Date();
        const deadlineDate = new Date();
        deadlineDate.setDate(today.getDate() + 5);

        const newDate = new Date();
        newDate.setDate(today.getDate() - 7);

        const userQual = user.qualification ? user.qualification.trim() : null;
        const userCat = user.qualificationCategory ? user.qualificationCategory.trim() : null;

        if (!userQual && !userCat) return null;

        const matchingCriteria = [];
        if (userQual) matchingCriteria.push({ qualification: { $regex: new RegExp(`^${userQual}$`, "i") } });
        if (userCat) matchingCriteria.push({ category: { $regex: new RegExp(`^${userCat}$`, "i") } });

        // Deadlines
        const deadlineJobs = await Job.find({
            $or: matchingCriteria,
            closeDate: { $gte: today, $lte: deadlineDate }
        });
        const deadlineCourses = await Course.find({
            $or: matchingCriteria,
            closeDate: { $gte: today, $lte: deadlineDate }
        });

        // New availability
        const newJobs = await Job.find({
            $or: matchingCriteria,
            createdAt: { $gte: newDate }
        });
        const newCourses = await Course.find({
            $or: matchingCriteria,
            createdAt: { $gte: newDate }
        });

        if (deadlineJobs.length === 0 && deadlineCourses.length === 0 && newJobs.length === 0 && newCourses.length === 0) return null;

        let message = `Here is your daily update with opportunities matching your profile:\n\n`;

        if (deadlineJobs.length > 0 || deadlineCourses.length > 0) {
            message += `**⏳ Upcoming Deadlines:**\n`;
            if (deadlineJobs.length > 0) message += `- ${deadlineJobs.length} job(s) closing within 5 days\n`;
            if (deadlineCourses.length > 0) message += `- ${deadlineCourses.length} course(s) closing within 5 days\n`;
            message += `\n`;
        }

        if (newJobs.length > 0 || newCourses.length > 0) {
            message += `**🌟 New Opportunities Available:**\n`;
            if (newJobs.length > 0) message += `- ${newJobs.length} new job(s) added recently\n`;
            if (newCourses.length > 0) message += `- ${newCourses.length} new course(s) added recently\n`;
            message += `\n`;
        }

        message += `Log in to your Dashboard to review these opportunities and take action!`;

        await sendAlertEmail(user.email, user.name, "Your Personalized Alert News & Deadlines", message, `${process.env.FRONTEND_URL || 'http://localhost:8080'}/dashboard`);

        return true;
    } catch (error) {
        console.error("News Digest Error:", error);
    }
};

/**
 * Run bulk analysis to send the daily news digest to all users.
 */
export const runBulkDailyNewsDigest = async () => {
    try {
        const users = await User.find({ role: "user" });
        console.log(`📡 [NewsDigest] Starting analysis for ${users.length} users...`);
        
        let sentCount = 0;
        for (const user of users) {
             const result = await sendDailyNewsDigest(user);
             if (result) sentCount++;
        }
        
        console.log(`✅ [NewsDigest] Completed. Sent ${sentCount} alert news emails.`);
        return sentCount;
    } catch (error) {
        console.error("❌ [NewsDigest] Bulk analysis failed:", error);
    }
};
