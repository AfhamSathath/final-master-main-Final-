// src/pages/company/CompanyJobsPage.tsx
import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import { Edit, Trash2, PlusCircle, X, Building2, Calendar, GraduationCap } from "lucide-react";
import { getUser } from "@/utils/Auth";
import { SRI_LANKA_DISTRICTS } from "@/constants/srilankaDistricts";
import { QUALIFICATION_OPTIONS, ALL_QUALIFICATION_OPTIONS } from "@/constants/qualifications";
import { MultiSelectDropdown } from "@/components/MultiSelectDropdown";

// ================== HELPER FUNCTION ==================
const LinkifyText = ({ text }: { text: string }) => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  
  return (
    <span>
      {parts.map((part, index) => {
        if (urlRegex.test(part)) {
          return (
            <a
              key={index}
              href={part}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 underline hover:text-blue-800"
            >
              {part}
            </a>
          );
        }
        return <span key={index}>{part}</span>;
      })}
    </span>
  );
};

// ================== TYPES ==================
export type Job = {
  _id: string;
  title: string;
  description: string;
  company: string;
  qualification?: string[];
  openDate?: string;
  closeDate?: string;
  category?: string;
  positionType?: "full-time" | "part-time" | "internship";
  paymentType?: "paid" | "unpaid";
  location?: string;
  approvalStatus?: "pending" | "approved" | "rejected";
  rejectionReason?: string;
};

type CompanyProfile = {
  _id: string;
  name: string;
  verificationStatus: "pending" | "verified" | "rejected";
  rejectionReason?: string;
};

type NewJob = Omit<Job, "_id">;

// ================== CONSTANTS ==================
const API_BASE = "http://localhost:5000/api/jobs";
const POSITION_TYPE_OPTIONS = ["full-time", "part-time", "internship"];
const PAYMENT_TYPE_OPTIONS = ["paid", "unpaid"];

const CATEGORY_OPTIONS = [
  "Information Technology", 
  "Business & Management",
  "Engineering",
  "Digital Marketing",
  "Health & Safety Management",
  "Others",
];

const CATEGORY_COLORS: Record<string, string> = {
  "Information Technology": "bg-blue-100 text-blue-800",
  "Business & Management": "bg-green-100 text-green-800",
  "Engineering": "bg-yellow-100 text-yellow-800",
  "Digital Marketing": "bg-purple-100 text-purple-800",
  "Health & Safety Management": "bg-red-100 text-red-800",
  "Others": "bg-gray-100 text-gray-800",
};

// ================== API ==================
const fetchJobs = async (): Promise<Job[]> => {
  const token = localStorage.getItem("token");
  const res = await axios.get(API_BASE, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
};

const fetchProfile = async (): Promise<CompanyProfile> => {
    const token = localStorage.getItem("token");
    const res = await axios.get("http://localhost:5000/api/companies/me/profile", {
      headers: { Authorization: `Bearer ${token}` }
    });
    return res.data;
  };

const createJob = async (newJob: NewJob) => {
  const token = localStorage.getItem("token");
  const res = await axios.post(API_BASE, newJob, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
};

const updateJob = async (updatedJob: Job) => {
  const token = localStorage.getItem("token");
  const res = await axios.put(`${API_BASE}/${updatedJob._id}`, updatedJob, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
};

const deleteJob = async (id: string) => {
  const token = localStorage.getItem("token");
  await axios.delete(`${API_BASE}/${id}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
};

// ================== COMPONENT ==================
const CompanyJobsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const user = getUser();
  const companyName = user?.name || "Unknown Company";

  const [showForm, setShowForm] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [formData, setFormData] = useState<NewJob>({
    title: "",
    description: "",
    company: companyName,
    qualification: [],
    openDate: "",
    closeDate: "",
    category: "",
    positionType: "full-time",
    paymentType: "paid",
    location: "",
    approvalStatus: "pending",
  });
  const [filterCategory, setFilterCategory] = useState("");
  const [filterPositionType, setFilterPositionType] = useState("");
  const [filterPaymentType, setFilterPaymentType] = useState("");
  const [filterLocation, setFilterLocation] = useState("");
  const [filterQualification, setFilterQualification] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    setFormData((prev) => ({ ...prev, company: companyName }));
  }, [companyName]);

  const { data: jobs = [], isLoading, isError } = useQuery<Job[]>({
    queryKey: ["jobs"],
    queryFn: fetchJobs,
  });

  const { data: profile } = useQuery<CompanyProfile>({
    queryKey: ["profile"],
    queryFn: fetchProfile,
  });

  const isVerified = profile?.verificationStatus === "verified";

  const createMutation = useMutation({
    mutationFn: createJob,
    onSuccess: () => {
      toast.success("✅ Job created successfully");
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      setShowForm(false);
    },
    onError: () => toast.error("❌ Failed to create job"),
  });

  const updateMutation = useMutation({
    mutationFn: updateJob,
    onSuccess: () => {
      toast.success("✅ Job updated successfully");
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      setShowForm(false);
      setEditingJob(null);
    },
    onError: () => toast.error("❌ Failed to update job"),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteJob,
    onSuccess: () => {
      toast.success("🗑️ Job deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
    },
    onError: () => toast.error("❌ Failed to delete job"),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title) {
      toast.error("⚠️ Job title is required");
      return;
    }

    const payload = { ...formData, company: companyName };
    editingJob
      ? updateMutation.mutate({ ...editingJob, ...payload })
      : createMutation.mutate(payload);
  };

  const companyJobs = jobs.filter((j) => j.company === companyName);
  const filteredJobs = companyJobs.filter((j) => {
    const matchesCategory = filterCategory ? j.category === filterCategory : true;
    const matchesPosition = filterPositionType ? j.positionType === filterPositionType : true;
    const matchesPayment = filterPaymentType ? j.paymentType === filterPaymentType : true;
    const matchesLocation = filterLocation ? j.location === filterLocation : true;
    const matchesQualification = filterQualification.length > 0 ? filterQualification.some(q => j.qualification && j.qualification.includes(q)) : true;
    const term = searchTerm.trim().toLowerCase();
    const matchesSearch =
      term === "" ||
      j.title.toLowerCase().includes(term) ||
      j.description.toLowerCase().includes(term) ||
      j.company.toLowerCase().includes(term) ||
      (j.location?.toLowerCase().includes(term));
    return matchesCategory && matchesPosition && matchesPayment && matchesLocation && matchesQualification && matchesSearch;
  });

  if (isLoading) return <p className="text-center mt-10 text-gray-600">Loading jobs...</p>;
  if (isError) return <p className="text-center mt-10 text-red-500">Failed to load jobs.</p>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-100 p-10">
      <Toaster position="top-center" />
      <h1 className="text-4xl font-bold text-center mb-10 text-blue-700 drop-shadow-sm">
        💼 {companyName} Jobs Dashboard
      </h1>

      {/* Filter & Add */}
      <div className="flex flex-col lg:flex-row gap-3 justify-between max-w-5xl mx-auto mb-8">
        <div className="flex flex-wrap gap-3">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by title, description, qualification"
            className="border rounded-lg p-3 min-w-[180px]"
          />
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="border rounded-lg p-3 bg-white shadow-sm focus:ring-2 focus:ring-blue-400"
          >
            <option value="">All Categories</option>
            {CATEGORY_OPTIONS.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <select
            value={filterPositionType}
            onChange={(e) => setFilterPositionType(e.target.value)}
            className="border rounded-lg p-3 bg-white shadow-sm focus:ring-2 focus:ring-blue-400"
          >
            <option value="">All Position Types</option>
            {POSITION_TYPE_OPTIONS.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
          <select
            value={filterPaymentType}
            onChange={(e) => setFilterPaymentType(e.target.value)}
            className="border rounded-lg p-3 bg-white shadow-sm focus:ring-2 focus:ring-blue-400"
          >
            <option value="">All Payment Types</option>
            {PAYMENT_TYPE_OPTIONS.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
          <select
            value={filterLocation}
            onChange={(e) => setFilterLocation(e.target.value)}
            className="border rounded-lg p-3 bg-white shadow-sm focus:ring-2 focus:ring-blue-400"
          >
            <option value="">All Districts</option>
            {SRI_LANKA_DISTRICTS.map((district) => (
              <option key={district} value={district}>{district}</option>
            ))}
          </select>
          <div className="min-w-[200px]">
            <MultiSelectDropdown
              options={ALL_QUALIFICATION_OPTIONS}
              selectedValues={filterQualification}
              onChange={setFilterQualification}
              placeholder="All Qualifications"
            />
          </div>
        </div>

        <button
          onClick={() => {
            if (!isVerified) {
              toast.error("⚠️ Your account must be verified before you can post jobs.");
              return;
            }
            setShowForm(true);
            setEditingJob(null);
            setFormData({
              title: "",
              description: "",
              company: companyName,
              qualification: [],
              openDate: "",
              closeDate: "",
              category: "",
              positionType: "full-time",
              paymentType: "paid",
              approvalStatus: "pending",
            });
          }}
          disabled={!isVerified}
          className={`${
            isVerified 
            ? "bg-gradient-to-r from-green-500 to-emerald-600 hover:shadow-lg transition-transform hover:scale-105" 
            : "bg-gray-400 cursor-not-allowed opacity-70"
          } text-white px-5 py-3 rounded-xl font-medium shadow-md flex items-center gap-2`}
        >
          <PlusCircle className="w-5 h-5" /> Add Job
        </button>
      </div>

      {/* Verification Warning */}
      {!isVerified && profile && (
        <div className="max-w-5xl mx-auto mb-8 bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg shadow-sm">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-amber-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-amber-800">
                Account Verification Required
              </h3>
              <div className="mt-2 text-sm text-amber-700">
                <p>
                  {profile.verificationStatus === "pending" 
                    ? "Your account is currently waiting for admin verification. You can view your jobs once they are approved, but you cannot post new ones yet."
                    : `Your account verification was rejected. Reason: ${profile.rejectionReason || "None provided"}. Please contact support.`}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Jobs Grid */}
      {filteredJobs.length === 0 ? (
        <p className="text-center text-gray-600 italic">No jobs available.</p>
      ) : (
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {filteredJobs.map((job) => (
            <div
              key={job._id}
              className="bg-white/70 backdrop-blur-md border border-gray-200 shadow-md rounded-2xl p-6 transition hover:shadow-xl hover:-translate-y-1"
            >
              <div className="flex justify-between items-start mb-3">
                <h2 className="text-xl font-semibold text-gray-800">{job.title}</h2>
                <span
                  className={`text-xs px-2 py-1 rounded-full font-semibold ${
                    CATEGORY_COLORS[job.category || ""] || "bg-gray-100 text-gray-800"
                  }`}
                >
                  {job.category || ""}
                </span>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-blue-600" />
                  <span className="text-sm bg-blue-50 text-blue-800 px-2 py-1 rounded-md font-medium">
                    {job.company}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-emerald-600" />
                  <span className="text-sm bg-emerald-50 text-emerald-800 px-2 py-1 rounded-md font-medium">
                    Qualification: {(job.qualification && job.qualification.length > 0) ? job.qualification.join(", ") : "N/A"}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-sm bg-indigo-50 text-indigo-800 px-2 py-1 rounded-md font-medium">
                    Type: {job.positionType || "N/A"}
                  </span>
                  <span className="text-sm bg-emerald-50 text-emerald-800 px-2 py-1 rounded-md font-medium">
                    Payment: {job.paymentType ? job.paymentType.toUpperCase() : "N/A"}
                  </span>
                </div>

                {job.location && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm bg-blue-50 text-blue-800 px-2 py-1 rounded-md font-medium">
                      Location: {job.location}
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-purple-600" />
                  <span className="text-sm bg-purple-50 text-purple-800 px-2 py-1 rounded-md font-medium">
                    Open: {job.openDate || "N/A"}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-rose-600" />
                  <span className="text-sm bg-rose-50 text-rose-800 px-2 py-1 rounded-md font-medium">
                    Close: {job.closeDate || "N/A"}
                  </span>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <span className={`text-xs px-2 py-1 rounded-full font-bold uppercase ${
                    job.approvalStatus === "approved" ? "bg-green-100 text-green-700" :
                    job.approvalStatus === "rejected" ? "bg-red-100 text-red-700" :
                    "bg-amber-100 text-amber-700"
                  }`}>
                    {job.approvalStatus}
                  </span>
                  {job.approvalStatus === "rejected" && job.rejectionReason && (
                    <span className="text-[10px] text-red-500 italic truncate max-w-[150px]" title={job.rejectionReason}>
                      Reason: {job.rejectionReason}
                    </span>
                  )}
                </div>
              </div>

              {/* ✅ Linkify makes URLs clickable */}
              <div className="text-gray-700 text-sm mb-4 border-t pt-2">
                <LinkifyText text={job.description || "No description provided."} />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setEditingJob(job);
                    setFormData({
                      title: job.title,
                      description: job.description,
                      company: companyName,
                      qualification: job.qualification || [],
                      openDate: job.openDate,
                      closeDate: job.closeDate,
                      category: job.category,
                      positionType: job.positionType || "full-time",
                      paymentType: job.paymentType || "paid",
                      location: job.location || "",
                      approvalStatus: job.approvalStatus,
                    });
                    setShowForm(true);
                  }}
                  className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition"
                >
                  <Edit className="w-4 h-4" /> Edit
                </button>
                <button
                  onClick={() => deleteMutation.mutate(job._id)}
                  className="flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition"
                >
                  <Trash2 className="w-4 h-4" /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-8 shadow-2xl w-full max-w-2xl relative animate-fade-in">
            <button
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-800"
              onClick={() => setShowForm(false)}
            >
              <X className="w-6 h-6" />
            </button>
            <h2 className="text-2xl font-bold text-blue-700 mb-5 flex items-center gap-2">
              {editingJob ? <Edit className="w-5 h-5" /> : <PlusCircle className="w-5 h-5" />}
              {editingJob ? "Edit Job" : "Add New Job"}
            </h2>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Job Title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="border rounded-lg p-3 focus:ring-2 focus:ring-blue-400"
                required
              />
              <input
                type="text"
                value={companyName}
                readOnly
                className="border rounded-lg p-3 bg-gray-100 text-gray-500"
              />
              <div className="w-full">
                <MultiSelectDropdown
                  options={ALL_QUALIFICATION_OPTIONS}
                  selectedValues={formData.qualification as string[]}
                  onChange={(selected: string[]) => setFormData({ ...formData, qualification: selected })}
                  placeholder="Select Qualification(s)"
                />
              </div>
              <input
                type="date"
                placeholder="Open Date"
                value={formData.openDate}
                onChange={(e) => setFormData({ ...formData, openDate: e.target.value })}
                className="border rounded-lg p-3 focus:ring-2 focus:ring-blue-400"
              />
              <input
                type="date"
                placeholder="Close Date"
                value={formData.closeDate}
                onChange={(e) => setFormData({ ...formData, closeDate: e.target.value })}
                className="border rounded-lg p-3 focus:ring-2 focus:ring-blue-400"
              />
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="border rounded-lg p-3 focus:ring-2 focus:ring-blue-400"
              >
                <option value="">Select Category</option>
                {CATEGORY_OPTIONS.map((cat) => (
                  <option key={cat}>{cat}</option>
                ))}
              </select>
              <select
                value={formData.positionType}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    positionType: e.target.value as "full-time" | "part-time" | "internship",
                  })
                }
                className="border rounded-lg p-3 focus:ring-2 focus:ring-blue-400"
              >
                <option value="">Select Position Type</option>
                {POSITION_TYPE_OPTIONS.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
              <select
                value={formData.paymentType}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    paymentType: e.target.value as "paid" | "unpaid",
                  })
                }
                className="border rounded-lg p-3 focus:ring-2 focus:ring-blue-400"
              >
                <option value="">Select Payment Type</option>
                {PAYMENT_TYPE_OPTIONS.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
              <select
                value={formData.location}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    location: e.target.value,
                  })
                }
                className="border rounded-lg p-3 focus:ring-2 focus:ring-blue-400"
              >
                <option value="">Select District</option>
                {SRI_LANKA_DISTRICTS.map((district) => (
                  <option key={district} value={district}>
                    {district}
                  </option>
                ))}
              </select>
              <textarea
                placeholder="Description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="border rounded-lg p-3 md:col-span-2 focus:ring-2 focus:ring-blue-400"
                rows={4}
              />
              <button
                type="submit"
                className="col-span-2 mt-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white py-3 rounded-lg font-medium hover:shadow-lg transition"
              >
                {editingJob ? "Update Job" : "Create Job"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompanyJobsPage;
