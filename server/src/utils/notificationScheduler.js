import cron from "node-cron";
import { runBulkDeadlineAlert, runBulkDailyNewsDigest } from "./deadlineAlertService.js";

/**
 * Starts the background scheduler for job and course alerts.
 * Runs daily at midnight for the QJC Platform.
 */
const startNotificationScheduler = () => {
    // Run every day at 00:00 (Midnight)
    cron.schedule("0 0 * * *", async () => {
        console.log("⏰ [Scheduler] Running Daily Deadline Alert Task...");
        
        try {
            const [deadlineCount, digestCount] = await Promise.all([
                 runBulkDeadlineAlert(),
                 runBulkDailyNewsDigest()
            ]);
            console.log(`✅ [Scheduler] Daily Alert Task Completed. Context: Sent ${deadlineCount} deadline alerts, and ${digestCount} news digests.`);
        } catch (error) {
            console.error("❌ [Scheduler] Error in daily alert task:", error);
        }
    });

    console.log("🚀 [Scheduler] Notification scheduler initialized (Running at 00:00 Daily)");
};

export default startNotificationScheduler;
