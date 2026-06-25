import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import http from "http";
import { Server } from "socket.io";
import connectDB from "./db.js";
import User from "./models/User.js";
import startNotificationScheduler from "./src/utils/notificationScheduler.js";
import { initSocketManager } from "./src/utils/socketManager.js";
import notificationRoutes from "./Routes/notificationRoutes.js";
import fs from "fs";

// Routes
import userRoutes from "./Routes/userRoutes.js";
import authRoutes from "./Routes/authRoutes.js";
import jobRoutes from "./Routes/jobRoutes.js";
import courseRoutes from "./Routes/courseRoutes.js";
import companyRoutes from "./Routes/companyRoutes.js";
import adminRoutes from "./Routes/adminRoutes.js";
import verifyCompanyRoute from "./Routes/verifyCompany.js";
import duplicateCheckRouter from "./Routes/checkDuplicate.js";

connectDB();
startNotificationScheduler();

const app = express();
const PORT = process.env.PORT || 5000;

// ========================
// Create HTTP server + Socket.io
// ========================
const server = http.createServer(app);

export const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:8081",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  },
});

// ✅ Initialize the Socket Manager for Notification Broadcasting
initSocketManager(io);

// Log socket connections
io.on("connection", (socket) => {
  console.log("🟢 Client connected:", socket.id);

  // ✅ Join a room (used for magic link real-time notification)
  socket.on("join", (room) => {
    console.log(`📡 Client ${socket.id} joining room: ${room}`);
    socket.join(room);
  });

  socket.on("disconnect", () => console.log("🔴 Client disconnected:", socket.id));
});

// ========================
// Middleware
// ========================
import path from "path";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDistPath = path.resolve(__dirname, "../clientnew/dist");
const clientIndexPath = path.join(clientDistPath, "index.html");
const hasClientBuild = fs.existsSync(clientIndexPath);

app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
const allowedOrigin = process.env.FRONTEND_URL || "http://localhost:8081"; // frontend URL from env

app.use(
  cors({
    origin: allowedOrigin,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

if (hasClientBuild) {
  app.use(express.static(clientDistPath));
}



// ========================
// Routes
// ========================
app.get("/", (req, res) => {
  if (hasClientBuild) {
    return res.sendFile(clientIndexPath);
  }

  return res.send("API running successfully");
});

app.use("/api/users", userRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/companies", companyRoutes);
app.use("/api/admins", adminRoutes);

app.use("/api/notifications", notificationRoutes);

app.use("/api/verify-company", verifyCompanyRoute);
app.use("/api/check-duplicate", duplicateCheckRouter);

if (hasClientBuild) {
  app.get(/^\/(?!api\/|uploads\/).*/, (req, res) => {
    res.sendFile(clientIndexPath);
  });
}

// ========================
// Auth Register Route
// ========================
app.post("/auth/register", async (req, res) => {
  try {
    const { name, email, password, role, contactNumber, location } = req.body;

    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ message: "Name, email, and password are required." });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already registered." });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = new User({
      name,
      email,
      password: hashedPassword,
      role,
      contactNumber,
      location,
    });

    await user.save();
    res.json({ message: "Registration successful", user });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// ========================
// Test Route
// ========================
app.get("/api/hello", (_req, res) => {
  res.json({ message: "Hello from Express 👋" });
});

// ========================
// Start Server
// ========================
server.listen(PORT, () => {
  console.log(`✅ Server running with Socket.io on http://localhost:${PORT}`);
});