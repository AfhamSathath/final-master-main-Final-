// src/pages/admin/AdminCoursesPage.tsx
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
  Clock,
  GraduationCap,
} from "lucide-react";
import Linkify from "linkify-react";

// ================== TYPES ==================
type Course = {
  _id: string;
  name: string;
  description: string;
  institution: string;
  qualification?: string[];
  duration: string;
  category: string;
  location?: string;


  courseType?: "full-time" | "part-time";
  paymentType?: "paid" | "unpaid";
  closeDate?: string;
  createdAt: string;
};

type NewCourse = Omit<Course, "_id" | "createdAt">;

type Company = {
  _id: string;
  name: string;
};

// ================== CONSTANTS ==================
const API_BASE = "http://localhost:5000/api/courses";
const COMPANY_API = "http://localhost:5000/api/companies";


const COURSE_TYPE_OPTIONS = ["full-time", "part-time"];
const PAYMENT_TYPE_OPTIONS = ["paid", "unpaid"];


const CATEGORY_OPTIONS = [
  "Information Technology",
  "Business & Management",
  "Engineering",
  "Digital Marketing",
  "Health & Safety Management",
  "Education",
];

const CATEGORY_COLORS: Record<string, string> = {
  "Information Technology": "bg-blue-100 text-blue-800",
  "Business & Management": "bg-green-100 text-green-800",
  Engineering: "bg-yellow-100 text-yellow-800",
  "Digital Marketing": "bg-purple-100 text-purple-800",
  "Health & Safety Management": "bg-red-100 text-red-800",
  Education: "bg-pink-100 text-pink-800",
};

// ================== API CALLS ==================
const fetchCourses = async (): Promise<Course[]> => {
  const res = await axios.get(API_BASE);
  return res.data;
};

const fetchCompanies = async (): Promise<Company[]> => {
  const res = await axios.get(COMPANY_API);
  return Array.isArray(res.data) ? res.data : [];
};

const createCourse = async (newCourse: NewCourse) => {
  const res = await axios.post(API_BASE, newCourse);
  return res.data;
};

const updateCourse = async (updatedCourse: Course) => {
  const res = await axios.put(`${API_BASE}/${updatedCourse._id}`, updatedCourse);
  return res.data;
};

const deleteCourse = async (id: string) => {
  await axios.delete(`${API_BASE}/${id}`);
};

// ================== COMPONENT ==================
const AdminCoursesPage: React.FC = () => {
  const queryClient = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [filterCategory, setFilterCategory] = useState("");
  const [filterLocation, setFilterLocation] = useState("");
  const [filterCourseType, setFilterCourseType] = useState("");
  const [filterPaymentType, setFilterPaymentType] = useState("");
  const [filterQualification, setFilterQualification] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState<NewCourse>({
    name: "",
    description: "",
    institution: "",
    qualification: [],
    duration: "",
    category: "",
    location: "",
    courseType: "full-time",
    paymentType: "paid",
    closeDate: "",
  });
  const [companies, setCompanies] = useState<Company[]>([]);

  const { data: courses = [], isLoading, isError } = useQuery<Course[]>({
    queryKey: ["courses"],
    queryFn: fetchCourses,
  });

  useEffect(() => {
    fetchCompanies()
      .then(setCompanies)
      .catch(() => toast.error("❌ Failed to load companies"));
  }, []);

  const createMutation = useMutation({
    mutationFn: createCourse,
    onSuccess: () => {
      toast.success("✅ Course created successfully");
      queryClient.invalidateQueries({ queryKey: ["courses"] });
      setShowForm(false);
    },
    onError: () => toast.error("❌ Failed to create course"),
  });

  const updateMutation = useMutation({
    mutationFn: updateCourse,
    onSuccess: () => {
      toast.success("✅ Course updated successfully");
      queryClient.invalidateQueries({ queryKey: ["courses"] });
      setEditingCourse(null);
      setShowForm(false);
    },
    onError: () => toast.error("❌ Failed to update course"),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCourse,
    onSuccess: () => {
      toast.success("🗑️ Course deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["courses"] });
    },
    onError: () => toast.error("❌ Failed to delete course"),
  });

  const broadcastMutation = useMutation({
    mutationFn: async ({ title, message }: { title: string; message: string }) => {
      return axios.post("http://localhost:5000/api/admins/broadcast", { title, message });
    },
    onSuccess: () => toast.success("📢 Broadcast sent to all users!"),
    onError: () => toast.error("❌ Failed to send broadcast"),
  });

  const handleBroadcast = () => {
      const title = window.prompt("Enter Notification Title:", "New Course Category Added!");
      const message = window.prompt("Enter Notification Message:", "Check out our newest educational categories available now.");
      if (title && message) {
          broadcastMutation.mutate({ title, message });
      }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.institution) {
      toast.error("⚠️ Name and Institution are required");
      return;
    }
    editingCourse
      ? updateMutation.mutate({ ...editingCourse, ...formData })
      : createMutation.mutate(formData);
  };

  const filteredCourses = courses.filter((c) => {
    const matchesCategory = filterCategory ? c.category === filterCategory : true;
    const matchesLocation = filterLocation ? c.location === filterLocation : true;
    const matchesCourseType = filterCourseType ? c.courseType === filterCourseType : true;
    const matchesPaymentType = filterPaymentType ? c.paymentType === filterPaymentType : true;
    const matchesSearch =
      searchTerm.trim() === "" ||
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.institution.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.location || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesQualification = filterQualification.length > 0 ? filterQualification.some(q => c.qualification && c.qualification.includes(q)) : true;
    return matchesCategory && matchesLocation && matchesCourseType && matchesPaymentType && matchesSearch && matchesQualification;
  });

  if (isLoading)
    return <p className="text-center mt-10 text-gray-600">Loading courses...</p>;
  if (isError)
    return <p className="text-center mt-10 text-red-500">Failed to load courses.</p>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-100 p-10 dark:from-gray-900 dark:to-gray-800">
      <Toaster position="top-center" />
      <div className="flex justify-between items-center max-w-6xl mx-auto mb-10">
          <h1 className="text-4xl font-black text-blue-900 dark:text-blue-300 drop-shadow-sm">
            🧭 Courses Management
          </h1>
          <button 
            onClick={handleBroadcast}
            className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700 shadow-lg transition transform hover:scale-105"
          >
              📡 Broadcast Alert
          </button>
      </div>

      {/* Filter & Add */}
      <div className="flex flex-col lg:flex-row gap-3 justify-between max-w-6xl mx-auto mb-8 bg-white/50 backdrop-blur p-4 rounded-2xl shadow-sm border border-white">
        <div className="flex flex-wrap gap-3 flex-1">
          <input
            type="text"
            placeholder="🔍 Search name/institution"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="border rounded-lg p-3 bg-white dark:bg-gray-700 dark:text-white shadow-sm focus:ring-2 focus:ring-blue-400 flex-1"
          />
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="border rounded-lg p-3 bg-white dark:bg-gray-700 dark:text-white shadow-sm focus:ring-2 focus:ring-blue-400"
          >
            <option value="">All Categories</option>
            {CATEGORY_OPTIONS.map((cat) => (
              <option key={cat}>{cat}</option>
            ))}
          </select>
        </div>
        <button
          onClick={() => {
            setShowForm(true);
            setEditingCourse(null);
            setFormData({
              name: "",
              description: "",
              institution: "",
              qualification: [],
              duration: "",
              category: "",
              courseType: "full-time",
              paymentType: "paid",
              closeDate: "",
            });
          }}
          className="bg-blue-700 text-white px-6 py-3 rounded-xl font-bold shadow-md hover:bg-blue-800 flex items-center gap-2 transition"
        >
          <PlusCircle className="w-5 h-5" /> Add Course
        </button>
      </div>

      {/* Courses Grid */}
      {filteredCourses.length === 0 ? (
        <p className="text-center text-gray-600 italic">No courses available.</p>
      ) : (
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {filteredCourses.map((course) => (
            <div
              key={course._id}
              className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-md border border-gray-200 dark:border-gray-700 shadow-md rounded-2xl p-6 transition hover:shadow-xl hover:-translate-y-1"
            >
              <div className="flex justify-between items-start mb-3">
                <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
                  {course.name}
                </h2>
                <span
                  className={`text-xs px-2 py-1 rounded-full font-semibold ${
                    CATEGORY_COLORS[course.category] || "bg-gray-100 text-gray-800"
                  }`}
                >
                  {course.category}
                </span>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-blue-600" />
                  <span className="text-sm bg-blue-50 dark:bg-blue-900 text-blue-800 dark:text-blue-100 px-2 py-1 rounded-md font-medium">
                    {course.institution}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-emerald-600" />
                  <span className="text-sm bg-emerald-50 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-100 px-2 py-1 rounded-md font-medium">
                    Qualification: {(course.qualification && course.qualification.length > 0) ? course.qualification.join(", ") : "N/A"}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-sm bg-indigo-50 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-100 px-2 py-1 rounded-md font-medium">
                    Type: {course.courseType || "full-time"}
                  </span>
                  <span className="text-sm bg-emerald-50 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-100 px-2 py-1 rounded-md font-medium">
                    {course.paymentType ? course.paymentType.toUpperCase() : "PAID"}
                  </span>
                </div>
                {course.location && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm bg-purple-50 dark:bg-purple-900 text-purple-800 dark:text-purple-100 px-2 py-1 rounded-md font-medium">
                      District: {course.location}
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-purple-600" />
                  <span className="text-sm bg-purple-50 dark:bg-purple-900 text-purple-800 dark:text-purple-100 px-2 py-1 rounded-md font-medium">
                    Duration: {course.duration || "N/A"}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-red-600" />
                  <span className="text-sm bg-red-50 dark:bg-red-900 text-red-800 dark:text-red-100 px-2 py-1 rounded-md font-medium">
                    Deadline: {course.closeDate ? new Date(course.closeDate).toLocaleDateString() : "No Deadline"}
                  </span>
                </div>
              </div>

              <div className="text-gray-700 dark:text-gray-300 text-sm mb-4 border-t border-gray-200 dark:border-gray-700 pt-2 break-words">
                <Linkify
                  tagName="div"
                  options={{
                    target: "_blank",
                    rel: "noopener noreferrer",
                    className:
                      "text-blue-600 dark:text-blue-400 hover:underline hover:text-blue-800 dark:hover:text-blue-200",
                  }}
                >
                  {course.description || "No description provided."}
                </Linkify>
              </div>

              <div className="flex gap-3">

                <button
                  onClick={() => deleteMutation.mutate(course._id)}
                  className="flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition"
                >
                  <Trash2 className="w-4 h-4" /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-2xl w-full max-w-2xl relative animate-fade-in">
            <button
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 dark:text-gray-300 dark:hover:text-white"
              onClick={() => setShowForm(false)}
            >
              <X className="w-6 h-6" />
            </button>
            <h2 className="text-2xl font-bold text-blue-700 dark:text-blue-300 mb-5 flex items-center gap-2">
              {editingCourse ? <Edit className="w-5 h-5" /> : <PlusCircle className="w-5 h-5" />}
              {editingCourse ? "Edit Course" : "Add New Course"}
            </h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Course Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="border rounded-lg p-3 focus:ring-2 focus:ring-blue-400 dark:bg-gray-700 dark:text-white"
                required
              />

              <select
                value={formData.institution}
                onChange={(e) => setFormData({ ...formData, institution: e.target.value })}
                className="border rounded-lg p-3 focus:ring-2 focus:ring-blue-400 dark:bg-gray-700 dark:text-white"
                required
              >
                <option value="">Select Institution</option>
                {companies.map((c) => (
                  <option key={c._id}>{c.name}</option>
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
                type="text"
                placeholder="Duration"
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                className="border rounded-lg p-3 focus:ring-2 focus:ring-blue-400 dark:bg-gray-700 dark:text-white"
              />
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="border rounded-lg p-3 focus:ring-2 focus:ring-blue-400 dark:bg-gray-700 dark:text-white"
              >
                <option value="">Select Category</option>
                {CATEGORY_OPTIONS.map((cat) => (
                  <option key={cat}>{cat}</option>
                ))}
              </select>
              <select
                value={formData.courseType}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    courseType: e.target.value as "full-time" | "part-time",
                  })
                }
                className="border rounded-lg p-3 focus:ring-2 focus:ring-blue-400 dark:bg-gray-700 dark:text-white"
              >
                <option value="">Select Course Type</option>
                {COURSE_TYPE_OPTIONS.map((type) => (
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
                className="border rounded-lg p-3 focus:ring-2 focus:ring-blue-400 dark:bg-gray-700 dark:text-white"
              >
                <option value="">Select Payment Type</option>
                {PAYMENT_TYPE_OPTIONS.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
              <input
                type="date"
                placeholder="Enrollment Deadline"
                value={formData.closeDate ? formData.closeDate.substring(0, 10) : ""}
                onChange={(e) => setFormData({ ...formData, closeDate: e.target.value })}
                className="border rounded-lg p-3 focus:ring-2 focus:ring-blue-400 dark:bg-gray-700 dark:text-white"
              />
              <select
                value={formData.location}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    location: e.target.value,
                  })
                }
                className="border rounded-lg p-3 focus:ring-2 focus:ring-blue-400 dark:bg-gray-700 dark:text-white"
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
                className="border rounded-lg p-3 md:col-span-2 focus:ring-2 focus:ring-blue-400 dark:bg-gray-700 dark:text-white"
                rows={4}
              />
              <button
                type="submit"
                className="col-span-2 mt-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white py-3 rounded-lg font-medium hover:shadow-lg transition"
              >
                {editingCourse ? "Update Course" : "Create Course"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCoursesPage;
