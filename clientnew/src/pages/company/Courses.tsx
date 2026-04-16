// src/pages/company/CompanyCoursesPage.tsx
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
import { getUser } from "@/utils/Auth";
import Linkify from "linkify-react";

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
  createdAt: string;
};

type NewCourse = Omit<Course, "_id" | "createdAt">;

const API_BASE = "http://localhost:5000/api/courses";

const COURSE_TYPE_OPTIONS = ["full-time", "part-time"];
const PAYMENT_TYPE_OPTIONS = ["paid", "unpaid"];

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
const fetchCourses = async (): Promise<Course[]> => {
  const res = await axios.get(API_BASE);
  return res.data;
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

const fetchProfile = async (): Promise<{ verificationStatus: string; rejectionReason?: string }> => {
  const token = localStorage.getItem("token");
  const res = await axios.get("http://localhost:5000/api/companies/me/profile", {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
};

// ================== COMPONENT ==================
const CompanyCoursesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const user = getUser();
  const companyName = user?.name || "Unknown Company";

  const [showForm, setShowForm] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [formData, setFormData] = useState<NewCourse>({
    name: "",
    description: "",
    institution: companyName,
    qualification: [],
    duration: "",
    category: "",
    location: "",
    courseType: "full-time",
    paymentType: "paid",
  });
  const [filterCategory, setFilterCategory] = useState("");
  const [filterLocation, setFilterLocation] = useState("");
  const [filterCourseType, setFilterCourseType] = useState("");
  const [filterPaymentType, setFilterPaymentType] = useState("");
  const [filterQualification, setFilterQualification] = useState<string[]>([]);

  useEffect(() => {
    setFormData((prev) => ({ ...prev, institution: companyName }));
  }, [companyName]);

  const { data: courses = [], isLoading, isError } = useQuery<Course[]>({
    queryKey: ["courses"],
    queryFn: fetchCourses,
  });

  const { data: profile } = useQuery<{ verificationStatus: string; rejectionReason?: string }>({
    queryKey: ["profile"],
    queryFn: fetchProfile,
  });

  const isVerified = profile?.verificationStatus === "verified";

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
      setShowForm(false);
      setEditingCourse(null);
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      toast.error("⚠️ Course Name is required");
      return;
    }

    const payload = { ...formData, institution: companyName };
    editingCourse
      ? updateMutation.mutate({ ...editingCourse, ...payload })
      : createMutation.mutate(payload);
  };

  const companyCourses = courses.filter((c) => c.institution === companyName);
  const filteredCourses = companyCourses.filter((c) => {
    const matchesCategory = filterCategory ? c.category === filterCategory : true;
    const matchesLocation = filterLocation ? c.location === filterLocation : true;
    const matchesCourseType = filterCourseType ? c.courseType === filterCourseType : true;
    const matchesPaymentType = filterPaymentType ? c.paymentType === filterPaymentType : true;
    const matchesQualification = filterQualification.length > 0 ? filterQualification.some(q => c.qualification && c.qualification.includes(q)) : true;
    return matchesCategory && matchesLocation && matchesCourseType && matchesPaymentType && matchesQualification;
  });

  if (isLoading)
    return <p className="text-center mt-10 text-gray-600">Loading courses...</p>;
  if (isError)
    return <p className="text-center mt-10 text-red-500">Failed to load courses.</p>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-10 dark:from-gray-900 dark:to-gray-800">
      <Toaster position="top-center" />
      <h1 className="text-4xl font-bold text-center mb-10 text-blue-700 dark:text-blue-300 drop-shadow-sm">
        🎓 {companyName} Courses Dashboard
      </h1>

      {/* Filter & Add */}
      <div className="flex flex-wrap gap-3 justify-between max-w-5xl mx-auto mb-8">
        <div className="flex flex-wrap gap-3">
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
          <select
            value={filterCourseType}
            onChange={(e) => setFilterCourseType(e.target.value)}
            className="border rounded-lg p-3 bg-white dark:bg-gray-700 dark:text-white shadow-sm focus:ring-2 focus:ring-blue-400"
          >
            <option value="">All Types</option>
            {COURSE_TYPE_OPTIONS.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          <select
            value={filterPaymentType}
            onChange={(e) => setFilterPaymentType(e.target.value)}
            className="border rounded-lg p-3 bg-white dark:bg-gray-700 dark:text-white shadow-sm focus:ring-2 focus:ring-blue-400"
          >
            <option value="">All Payments</option>
            {PAYMENT_TYPE_OPTIONS.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          <select
            value={filterLocation}
            onChange={(e) => setFilterLocation(e.target.value)}
            className="border rounded-lg p-3 bg-white dark:bg-gray-700 dark:text-white shadow-sm focus:ring-2 focus:ring-blue-400"
          >
            <option value="">All Districts</option>
            {SRI_LANKA_DISTRICTS.map((district) => (
              <option key={district} value={district}>
                {district}
              </option>
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
              toast.error("⚠️ Your account must be verified before you can post courses.");
              return;
            }
            setShowForm(true);
            setEditingCourse(null);
            setFormData({
              name: "",
              description: "",
              institution: companyName,
              qualification: [],
              duration: "",
              category: "",
              location: "",
              courseType: "full-time",
              paymentType: "paid",
            });
          }}
          disabled={!isVerified}
          className={`${
            isVerified 
            ? "bg-gradient-to-r from-green-500 to-emerald-600 hover:shadow-lg transition-transform hover:scale-105" 
            : "bg-gray-400 cursor-not-allowed opacity-70"
          } text-white px-5 py-3 rounded-xl font-medium shadow-md flex items-center gap-2`}
        >
          <PlusCircle className="w-5 h-5" /> Add Course
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
                    ? "Your account is currently waiting for admin verification. You can view your courses once they are approved, but you cannot post new ones yet."
                    : `Your account verification was rejected. Reason: ${profile.rejectionReason || "None provided"}. Please contact support.`}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

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

              {/* Details */}
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
                    Payment: {course.paymentType ? course.paymentType.toUpperCase() : "PAID"}
                  </span>
                </div>
                {course.location && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm bg-blue-50 dark:bg-blue-900 text-blue-800 dark:text-blue-100 px-2 py-1 rounded-md font-medium">
                      Location: {course.location}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-purple-600" />
                  <span className="text-sm bg-purple-50 dark:bg-purple-900 text-purple-800 dark:text-purple-100 px-2 py-1 rounded-md font-medium">
                    Duration: {course.duration || "N/A"}
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
                  onClick={() => {
                    setEditingCourse(course);
                    setFormData({
                      name: course.name,
                      description: course.description,
                      institution: companyName,
                      qualification: course.qualification || [],
                      duration: course.duration,
                      category: course.category,
                      courseType: course.courseType || "full-time",
                      paymentType: course.paymentType || "paid",
                    });
                    setShowForm(true);
                  }}
                  className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition"
                >
                  <Edit className="w-4 h-4" /> Edit
                </button>
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

      {/* Modal */}
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
            <form
              onSubmit={handleSubmit}
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              <input
                type="text"
                placeholder="Course Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="border rounded-lg p-3 focus:ring-2 focus:ring-blue-400 dark:bg-gray-700 dark:text-white"
                required
              />
              <input
                type="text"
                value={companyName}
                readOnly
                className="border rounded-lg p-3 bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
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

export default CompanyCoursesPage;
