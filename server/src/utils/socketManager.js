export let io;

/**
 * Initialize the socket manager with the Socket.io server instance.
 * 
 * @param {Object} socketIoInstance - The initialized io instance.
 */
export const initSocketManager = (socketIoInstance) => {
    io = socketIoInstance;
    console.log("🟢 Socket Manager initialized with IO instance.");
};

/**
 * Emit a new notification event to a specific user.
 * 
 * @param {string} userId - Target user ID (socket room).
 * @param {Object} notification - Notification document/object.
 */
export const emitNotification = (userId, notification) => {
    try {
        if (!io) {
            console.warn("⚠️ Socket Manager not yet initialized. Cannot emit notification.");
            return;
        }
        if (!userId || !notification) return;
        const room = userId.toString();
        
        console.log(`📡 Emitting newNotification to room [${room}]: ${notification.title}`);
        io.to(room).emit("newNotification", notification);
    } catch (error) {
        console.error("❌ Socket emit error:", error);
    }
};
