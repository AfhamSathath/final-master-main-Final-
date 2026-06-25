// src/pages/admin/AdminJobsPage.tsx
import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import { SRI_LANKA_DISTRICTS } from "@/constants/srilankaDistricts";
import { QUALIFICATION_OPTIONS, ALL_QUALIFICATION_OPTIONS } from "@/constants/qualifications";
import { MultiSelectDropdown } from "@/components/MultiSelectDropdown";
import {
  Edit,
  Trash2,
  PlusCircle,
  X,
  Building2,
  Calendar,
  GraduationCap,
} from "lucide-react";
import Linkify from "linkify-react";

// ================== TYPES ==================
type Job = {
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
  rejectionReason?: string;
};

type NewJob = Omit<Job, "_id">;

const JOB_TYPE_OPTIONS = ["full-time", "part-time", "internship"];
const PAYMENT_TYPE_OPTIONS = ["paid", "unpaid"];

type Company = {
  _id: string;
  name: string;
};

// ================== CONSTANTS ==================
const API_BASE = "http://localhost:5000/api/jobs";
const COMPANY_API = "http://localhost:5000/api/companies";

const CATEGORY_OPTIONS = [
  "Information Technology",
  "Business & Management",
  "Engineering",
  "Digital Marketing",
  "Health & Safety Management",
];

const CATEGORY_COLORS: Record<string, string> = {
  "Information Technology": "bg-blue-100 text-blue-800",
  "Business & Management": "bg-green-100 text-green-800",
  Engineering: "bg-yellow-100 text-yellow-800",
  "Digital Marketing": "bg-purple-100 text-purple-800",
  "Health & Safety Management": "bg-red-100 text-red-800",
};

// ================== API ==================
const fetchJobs = async (): Promise<Job[]> => {
  const token = localStorage.getItem("token");
  const res = await axios.get(API_BASE, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return Array.isArray(res.data) ? res.data : [];
};

const fetchCompanies = async (): Promise<Company[]> => {
  const res = await axios.get(COMPANY_API);
  return Array.isArray(res.data) ? res.data : [];
};

const createJob = async (newJob: NewJob) => {
  const res = await axios.post(API_BASE, newJob);
  return res.data;
};

const updateJob = async (updatedJob: Job) => {
  const res = await axios.put(`${API_BASE}/${updatedJob._id}`, updatedJob);
  return res.data;
};

const deleteJob = async (id: string) => {
  await axios.delete(`${API_BASE}/${id}`);
};

const approveJobAPI = async (id: string) => {
  const res = await axios.put(`${API_BASE}/${id}/approve`);
  return res.data;
};

const rejectJobAPI = async ({ id, reason }: { id: string; reason: string }) => {
  const res = await axios.put(`${API_BASE}/${id}/reject`, { reason });
  return res.data;
};

// ================== COMPONENT ==================
const AdminJobsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [filterCategory, setFilterCategory] = useState("");
  const [filterLocation, setFilterLocation] = useState("");
  const [filterJobType, setFilterJobType] = useState("");
  const [filterPaymentType, setFilterPaymentType] = useState("");
  const [filterQualification, setFilterQualification] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState<NewJob>({
    title: "",
    description: "",
    company: "",
    qualification: [],
    openDate: "",
    closeDate: "",
    category: "",
    location: "",
  });

  const { data: jobs = [], isLoading, isError } = useQuery<Job[]>({
    queryKey: ["jobs"],
    queryFn: fetchJobs,
  });

  useEffect(() => {
    fetchCompanies()
      .then(setCompanies)
      .catch(() => toast.error("❌ Failed to load companies"));
  }, []);

  // ================== MUTATIONS ==================
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

  const approveMutation = useMutation({
    mutationFn: approveJobAPI,
    onSuccess: () => {
      toast.success("✅ Job approved and live!");
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
    },
    onError: () => toast.error("❌ Failed to approve job"),
  });

  const rejectMutation = useMutation({
    mutationFn: rejectJobAPI,
    onSuccess: () => {
      toast.success("❌ Job rejected.");
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
    },
    onError: () => toast.error("❌ Failed to reject job"),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.company) {
      toast.error("⚠️ Title and Company are required");
      return;
    }
    editingJob
      ? updateMutation.mutate({ ...editingJob, ...formData })
      : createMutation.mutate(formData);
  };

  const filteredJobs = jobs.filter((job) => {
    const matchesCategory = filterCategory ? job.category === filterCategory : true;
    const matchesLocation = filterLocation ? job.location === filterLocation : true;
    const matchesJobType = filterJobType ? job.positionType === filterJobType : true;
    const matchesPaymentType = filterPaymentType ? job.paymentType === filterPaymentType : true;
    const matchesQualification = filterQualification.length > 0 ? filterQualification.some(q => job.qualification && job.qualification.includes(q)) : true;
    const matchesSearch =
      searchTerm.trim() === "" ||
      job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (job.location || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.company.toLowerCase().includes(searchTerm.toLowerCase());
    return (
      matchesCategory &&
      matchesLocation &&
      matchesJobType &&
      matchesPaymentType &&
      matchesQualification &&
      matchesSearch
    );
  });

  if (isLoading)
    return <p className="text-center mt-10 text-gray-600">Loading jobs...</p>;
  if (isError)
    return <p className="text-center mt-10 text-red-500">Failed to load jobs.</p>;

  // ================== RENDER ==================
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-100 p-10">
      <Toaster position="top-center" />
      <h1 className="text-4xl font-bold text-center mb-10 text-blue-700 drop-shadow-sm">
        🧑‍💼 Admin Jobs Dashboard
      </h1>

      {/* Filter & Search & Add */}
      <div className="flex flex-col md:flex-row justify-between gap-4 max-w-6xl mx-auto mb-8">
        <input
          type="text"
          placeholder="🔍 Search title or company"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="border rounded-lg p-3 flex-1 bg-white shadow-sm focus:ring-2 focus:ring-blue-400"
        />
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="border rounded-lg p-3 bg-white shadow-sm focus:ring-2 focus:ring-blue-400"
        >
          <option value="">All Categories</option>
          {CATEGORY_OPTIONS.map((cat) => (
            <option key={cat}>{cat}</option>
          ))}
        </select>
        <button
          onClick={() => {
            setShowForm(true);
            setEditingJob(null);
            setFormData({
              title: "",
              description: "",
              company: "",
              qualification: [],
              openDate: "",
              closeDate: "",
              category: "",
              location: filterLocation || "",
              positionType: "full-time",
              paymentType: "paid",
            });
          }}
          className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white px-5 py-3 rounded-xl font-medium shadow-md hover:shadow-lg flex items-center gap-2 transition-transform hover:scale-105"
        >
          <PlusCircle className="w-5 h-5" /> Add Job
        </button>
      </div>

      {/* Jobs Grid */}
      {filteredJobs.length === 0 ? (
        <div className="text-center py-20 bg-white/50 rounded-3xl border border-dashed border-gray-300 mx-auto max-w-4xl">
            <p className="text-gray-500 text-lg italic font-medium">No job postings match your current filters.</p>
        </div>
      ) : (
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {filteredJobs.map((job) => (
            <div
              key={job._id}
              className={`bg-white/90 backdrop-blur-md border border-gray-200 shadow-md rounded-2xl p-6 transition hover:shadow-xl group`}
            >
              <div className="flex justify-between items-start mb-3">
                <h2 className="text-xl font-bold text-gray-900 group-hover:text-blue-700 transition-colors">
                  {job.title}
                </h2>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-blue-50 rounded">
                    <Building2 className="w-4 h-4 text-blue-600" />
                  </div>
                  <span className="text-sm font-bold text-gray-700">
                    {job.company}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                   <div className="p-1.5 bg-emerald-50 rounded">
                    <GraduationCap className="w-4 h-4 text-emerald-600" />
                  </div>
                  <span className="text-sm text-gray-600">
                    {(job.qualification && job.qualification.length > 0) ? job.qualification.join(", ") : "N/A"}
                  </span>
                </div>

                <div className="flex gap-2 flex-wrap mt-2">
                    {job.positionType && (
                        <span className="text-[10px] bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full font-bold border border-purple-100 uppercase">
                            {job.positionType}
                        </span>
                    )}
                    {job.paymentType && (
                        <span className="text-[10px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full font-bold border border-amber-100 uppercase">
                            {job.paymentType}
                        </span>
                    )}
                    {job.location && (
                        <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-bold border border-blue-100 uppercase">
                            {job.location}
                        </span>
                    )}
                </div>
              </div>

              <div className="text-gray-600 text-sm mb-6 border-t pt-3 line-clamp-3">
                  <Linkify
                  tagName="div"
                  options={{
                    target: "_blank",
                    rel: "noopener noreferrer",
                    className: "text-blue-600 hover:underline",
                  }}
                >
                  {job.description || "No description provided."}
                </Linkify>
              </div>

              <div className="flex gap-2 border-t pt-4">
                <button
                  onClick={() => { if(window.confirm("Delete job?")) deleteMutation.mutate(job._id); }}
                  className="flex-1 flex items-center justify-center gap-1 bg-red-50 text-red-600 py-2 rounded-lg hover:bg-red-100 transition text-xs font-bold"
                >
                  <Trash2 className="w-3 h-3" /> Delete
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
              {editingJob ? (
                <Edit className="w-5 h-5" />
              ) : (
                <PlusCircle className="w-5 h-5" />
              )}
              {editingJob ? "Edit Job" : "Add New Job"}
            </h2>

            <form
              onSubmit={handleSubmit}
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              <input
                type="text"
                placeholder="Job Title"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                className="border rounded-lg p-3 focus:ring-2 focus:ring-blue-400"
                required
              />
              <select
                value={formData.company}
                onChange={(e) =>
                  setFormData({ ...formData, company: e.target.value })
                }
                className="border rounded-lg p-3 focus:ring-2 focus:ring-blue-400"
                required
              >
                <option value="">Select Company</option>
                {companies.map((c) => (
                  <option key={c._id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
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
                onChange={(e) =>
                  setFormData({ ...formData, openDate: e.target.value })
                }
                className="border rounded-lg p-3 focus:ring-2 focus:ring-blue-400"
              />
              <input
                type="date"
                placeholder="Close Date"
                value={formData.closeDate}
                onChange={(e) =>
                  setFormData({ ...formData, closeDate: e.target.value })
                }
                className="border rounded-lg p-3 focus:ring-2 focus:ring-blue-400"
              />
              <select
                value={formData.category}
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value })
                }
                className="border rounded-lg p-3 focus:ring-2 focus:ring-blue-400"
              >
                <option value="">Select Category</option>
                {CATEGORY_OPTIONS.map((cat) => (
                  <option key={cat}>{cat}</option>
                ))}
              </select>
              <select
                value={formData.location || ""}
                onChange={(e) =>
                  setFormData({ ...formData, location: e.target.value })
                }
                className="border rounded-lg p-3 focus:ring-2 focus:ring-blue-400"
              >
                <option value="">Select District</option>
                {SRI_LANKA_DISTRICTS.map((district) => (
                  <option key={district} value={district}>{district}</option>
                ))}
              </select>
              <select
                value={formData.positionType || ""}
                onChange={(e) =>
                  setFormData({ ...formData, positionType: e.target.value as "full-time" | "part-time" | "internship" })
                }
                className="border rounded-lg p-3 focus:ring-2 focus:ring-blue-400"
              >
                <option value="">Select Job Type</option>
                {JOB_TYPE_OPTIONS.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
              <select
                value={formData.paymentType || ""}
                onChange={(e) =>
                  setFormData({ ...formData, paymentType: e.target.value as "paid" | "unpaid" })
                }
                className="border rounded-lg p-3 focus:ring-2 focus:ring-blue-400"
              >
                <option value="">Select Payment Type</option>
                {PAYMENT_TYPE_OPTIONS.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
              <textarea
                placeholder="Description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
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

export default AdminJobsPage;
