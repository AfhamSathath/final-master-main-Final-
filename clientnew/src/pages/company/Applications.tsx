import React, { useState, useEffect } from "react";
import axios from "axios";
import { Loader2, Inbox, Mail, Phone, MapPin, GraduationCap, Calendar, User as UserIcon } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

interface Job {
  _id: string;
  title: string;
  category?: string;
  location?: string;
}

interface User {
  _id: string;
  name: string;
  email: string;
  contactNumber?: string;
  location?: string;
  qualificationCategory?: string;
  qualification?: string[];
}

interface Application {
  _id: string;
  jobId: Job;
  userId: User;
  status: string;
  createdAt: string;
}

const CompanyApplicationsPage: React.FC = () => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJobId, setSelectedJobId] = useState<string>("All");

  const fetchApplications = async () => {
    setLoading(true);
    const token = localStorage.getItem("token");
    try {
      const response = await axios.get<Application[]>("http://localhost:5000/api/companies/me/applications", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setApplications(response.data);
    } catch (error) {
      console.error("Failed to load applications", error);
      toast.error("Failed to load applications.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
      </div>
    );
  }

  // Get unique jobs for filtering
  const jobsMap = new Map<string, Job>();
  applications.forEach((app) => {
    if (app.jobId && app.jobId._id) {
      jobsMap.set(app.jobId._id, app.jobId);
    }
  });
  const uniqueJobs = Array.from(jobsMap.values());

  const filteredApplications = applications.filter((app) => {
    if (selectedJobId === "All") return true;
    return app.jobId && app.jobId._id === selectedJobId;
  });

  return (
    <div className="space-y-6">
      <Toaster position="top-right" />
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Job Applications</h1>
          <p className="text-gray-600">Track and review applications submitted by candidates.</p>
        </div>
        <div className="bg-blue-100 text-blue-800 font-semibold px-4 py-2 rounded-full">
          Total Applications: {applications.length}
        </div>
      </div>

      {applications.length === 0 ? (
        <div className="bg-white rounded-xl shadow-md border border-gray-150 p-12 text-center">
          <Inbox className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">No Applications Yet</h3>
          <p className="text-gray-500">When candidates apply to your job listings, they will show up here.</p>
        </div>
      ) : (
        <>
          {/* Job Filter Tabs */}
          <div className="flex flex-wrap gap-2 pb-4 border-b border-gray-200">
            <button
              onClick={() => setSelectedJobId("All")}
              className={`px-4 py-2 rounded-full font-medium transition-all ${
                selectedJobId === "All"
                  ? "bg-blue-600 text-white shadow-md"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              All Jobs ({applications.length})
            </button>
            {uniqueJobs.map((job) => {
              const count = applications.filter((app) => app.jobId && app.jobId._id === job._id).length;
              return (
                <button
                  key={job._id}
                  onClick={() => setSelectedJobId(job._id)}
                  className={`px-4 py-2 rounded-full font-medium transition-all ${
                    selectedJobId === job._id
                      ? "bg-blue-600 text-white shadow-md"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {job.title} ({count})
                </button>
              );
            })}
          </div>

          {/* Applications list */}
          <div className="grid gap-6 md:grid-cols-2">
            {filteredApplications.map((app) => {
              if (!app.userId) return null;
              return (
                <div
                  key={app._id}
                  className="bg-white rounded-xl shadow-md border border-gray-150 p-6 flex flex-col justify-between hover:shadow-lg transition-shadow"
                >
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">
                          Applied For
                        </span>
                        <h3 className="text-lg font-bold text-gray-800 mt-1">{app.jobId?.title || "Deleted Job"}</h3>
                      </div>
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(app.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="border-t border-gray-100 pt-4 space-y-3">
                      <h4 className="font-semibold text-gray-700 flex items-center gap-2">
                        <UserIcon className="w-4 h-4 text-blue-500" />
                        {app.userId.name}
                      </h4>
                      <div className="grid grid-cols-1 gap-2 text-sm text-gray-600 pl-6">
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-gray-400" />
                          <span>{app.userId.email}</span>
                        </div>
                        {app.userId.contactNumber && (
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4 text-gray-400" />
                            <span>{app.userId.contactNumber}</span>
                          </div>
                        )}
                        {app.userId.location && (
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-gray-400" />
                            <span>{app.userId.location}</span>
                          </div>
                        )}
                      </div>

                      {app.userId.qualification && app.userId.qualification.length > 0 && (
                        <div className="mt-3 pl-6">
                          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Qualifications</span>
                          <div className="flex flex-wrap gap-1.5 mt-1.5">
                            {app.userId.qualification.map((qual, idx) => (
                              <span
                                key={idx}
                                className="text-xs font-medium text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-md flex items-center gap-1"
                              >
                                <GraduationCap className="w-3 h-3 text-green-600" />
                                {qual}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default CompanyApplicationsPage;
