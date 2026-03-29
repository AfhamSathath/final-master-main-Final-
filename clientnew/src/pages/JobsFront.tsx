import React, { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { io, Socket } from "socket.io-client";
import toast, { Toaster } from "react-hot-toast";
import { useNavigate } from "react-router-dom";

import { SRI_LANKA_DISTRICTS } from "@/constants/srilankaDistricts";

interface Job {
  _id: string;
  title: string;
  description?: string;
  qualification?: string;
  openDate?: string;
  closeDate?: string;
  category?: string;
  positionType?: "full-time" | "part-time" | "internship";
  paymentType?: "paid" | "unpaid";
  location?: string;
}

const POSITION_TYPE_OPTIONS = ["full-time", "part-time", "internship"];
const PAYMENT_TYPE_OPTIONS = ["paid", "unpaid"];

const JobPage: React.FC = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [positionType, setPositionType] = useState("");
  const [paymentType, setPaymentType] = useState("");
  const [location, setLocation] = useState("");
  const navigate = useNavigate();

  const API_BASE_URL = "http://localhost:5000/api/jobs";

  // ✅ Fetch jobs
  const fetchJobs = useCallback(async () => {
    setLoading(true);
    const token = localStorage.getItem("token");

    try {
      const url = new URL(API_BASE_URL);
      if (searchTerm) url.searchParams.append("search", searchTerm);
      if (positionType) url.searchParams.append("positionType", positionType);
      if (paymentType) url.searchParams.append("paymentType", paymentType);
      if (location) url.searchParams.append("location", location);

      const res = await fetch(url.toString(), {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Failed to fetch jobs");
      const data: Job[] = await res.json();
      setJobs(data);
    } catch (err) {
      console.error("Failed to load jobs:", err);
      toast.error("Failed to load jobs");
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, positionType, paymentType]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  // ✅ Real-time updates via Socket.io
  useEffect(() => {
    const token = localStorage.getItem("token");
    const socket: Socket = io("http://localhost:5000", { auth: { token } });

    socket.on("connect", () => console.log("Socket connected:", socket.id));
    socket.on("jobs:update", (updatedJobs: Job[]) => {
      setJobs(updatedJobs);
      toast.success("Jobs updated in real-time!");
    });
    socket.on("connect_error", (err: Error) =>
      toast.error("Socket.io connection failed: " + err.message)
    );

    return () => {
      socket.disconnect();
    };
  }, []);

  // ✅ Handle click on "More Details" button
  const handleMoreDetailsClick = (jobId: string) => {
    const token = localStorage.getItem("token");
    if (!token) {
      toast.error("Please register or log in to view job details.");
      setTimeout(() => navigate("/register"), 1000);
    } else {
      navigate(`/jobs/${jobId}`);
    }
  };

  if (loading)
    return (
      <div className="flex justify-center items-center h-screen bg-gradient-to-r from-blue-50 to-blue-100">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
      </div>
    );

  return (
    <div className="p-6 md:p-10 bg-gradient-to-br from-blue-50 via-white to-indigo-50 min-h-screen">
      <Toaster position="top-center" />
      <div className="text-center mb-8">
        <h1 className="text-4xl font-extrabold text-blue-700 mb-2">
          💼 Job Opportunities
        </h1>
        <p className="text-gray-600 text-lg">
          Browse available job listings — register to see more details.
        </p>
      </div>

      <div className="max-w-6xl mx-auto mb-6 flex flex-wrap gap-3 justify-center">
        <input
          type="text"
          placeholder="Search jobs..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="border rounded-lg px-3 py-2 w-full sm:w-64"
        />
        <select
          value={positionType}
          onChange={(e) => setPositionType(e.target.value)}
          className="border rounded-lg px-3 py-2 w-full sm:w-44"
        >
          <option value="">All Types</option>
          {POSITION_TYPE_OPTIONS.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
        <select
          value={paymentType}
          onChange={(e) => setPaymentType(e.target.value)}
          className="border rounded-lg px-3 py-2 w-full sm:w-44"
        >
          <option value="">All Payments</option>
          {PAYMENT_TYPE_OPTIONS.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>

        <select
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className="border rounded-lg px-3 py-2 w-full sm:w-52"
        >
          <option value="">All Districts</option>
          {SRI_LANKA_DISTRICTS.map((district) => (
            <option key={district} value={district}>
              {district}
            </option>
          ))}
        </select>
        <button
          onClick={() => {
            setSearchTerm("");
            setPositionType("");
            setPaymentType("");
            setLocation("");
          }}
          className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
        >
          Reset
        </button>
      </div>

      {/* ===== Job Cards ===== */}
      {jobs.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {jobs.map((job) => (
            <Card
              key={job._id}
              className="border border-blue-100 bg-white shadow-md hover:shadow-2xl transition-all duration-300 rounded-2xl"
            >
              <CardContent className="p-6 flex flex-col justify-between h-full">
                <div>
                  <h2 className="text-xl font-bold text-gray-800 mb-2">
                    {job.title}
                  </h2>

                  {job.category && (
                    <p className="text-sm text-gray-600 mb-1">
                      Category: {job.category}
                    </p>
                  )}
                  {job.positionType && (
                    <p className="text-sm text-gray-600 mb-1">
                      Type: {job.positionType}
                    </p>
                  )}
                  {job.paymentType && (
                    <p className="text-sm text-gray-600 mb-1">
                      Payment: {job.paymentType}
                    </p>
                  )}
                  {job.location && (
                    <p className="text-sm text-gray-600 mb-1">
                      Location: {job.location}
                    </p>
                  )}
                  {job.openDate && (
                    <p className="text-sm text-gray-500 mb-1">
                      Opens: {new Date(job.openDate).toLocaleDateString()}
                    </p>
                  )}
                  {job.closeDate && (
                    <p className="text-sm text-gray-500">
                      Closes: {new Date(job.closeDate).toLocaleDateString()}
                    </p>
                  )}
                </div>

                <button
                  onClick={() => handleMoreDetailsClick(job._id)}
                  className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-all duration-300 w-full"
                >
                  More Details
                </button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <p className="text-center text-gray-600 mt-8">No jobs found.</p>
      )}
    </div>
  );
};

export default JobPage;
