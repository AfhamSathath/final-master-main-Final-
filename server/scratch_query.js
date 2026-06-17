import dotenv from "dotenv";
dotenv.config();
import mongoose from "mongoose";
import Job from "./models/job.js";
import Company from "./models/Company.js";

async function run() {
  await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/finaljob_edu");
  console.log("Connected to DB");
  
  const jobs = await Job.find();
  console.log("Jobs in DB:");
  jobs.forEach(j => {
    console.log(`- Title: "${j.title}", Company: "${j.company}", ID: ${j._id}`);
  });

  const companies = await Company.find();
  console.log("Companies in DB:");
  companies.forEach(c => {
    console.log(`- Name: "${c.name}", ID: ${c._id}, Email: ${c.email}`);
  });

  mongoose.disconnect();
}

run();
