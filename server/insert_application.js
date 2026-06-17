import dotenv from "dotenv";
dotenv.config();
import mongoose from "mongoose";
import Application from "./models/Application.js";
import Job from "./models/job.js";
import User from "./models/User.js";
import Company from "./models/Company.js";

async function run() {
  await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/finaljob_edu");
  console.log("Connected to DB");

  // Get User
  const user = await User.findOne();
  if (!user) {
    console.log("No user found in DB!");
    mongoose.disconnect();
    return;
  }
  console.log("Found User:", user.name, "ID:", user._id);

  // Get Job
  const job = await Job.findOne({ company: "A Pvt ltd" });
  if (!job) {
    console.log("No job found for 'A Pvt ltd'!");
    mongoose.disconnect();
    return;
  }
  console.log("Found Job:", job.title, "ID:", job._id);

  // Delete existing applications
  await Application.deleteMany({});

  // Create Application
  const app = new Application({
    jobId: job._id,
    userId: user._id,
    companyName: "A Pvt ltd",
    status: "pending"
  });

  await app.save();
  console.log("Application created successfully!");

  mongoose.disconnect();
}

run();
