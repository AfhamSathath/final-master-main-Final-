import React, { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { io, Socket } from "socket.io-client";
import toast, { Toaster } from "react-hot-toast";
import { useNavigate } from "react-router-dom";

interface Course {
  _id: string;
  name?: string;
  institution?: string;
  description?: string;
  qualification?: string;
  duration?: string;
  category?: string;
  courseType?: "full-time" | "part-time" | "internship";
  paymentType?: "paid" | "unpaid";
}

const COURSE_TYPE_OPTIONS = ["full-time", "part-time", "internship"];
const PAYMENT_TYPE_OPTIONS = ["paid", "unpaid"];

const CoursePage: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [courseType, setCourseType] = useState("");
  const [paymentType, setPaymentType] = useState("");
  const navigate = useNavigate();

  const API_BASE_URL = "http://localhost:5000/api/courses";

  // ✅ Fetch Courses
  const fetchCourses = useCallback(async () => {
    setLoading(true);
    const token = localStorage.getItem("token");
    try {
      const url = new URL(API_BASE_URL);
      if (searchTerm) url.searchParams.append("search", searchTerm);
      if (courseType) url.searchParams.append("courseType", courseType);
      if (paymentType) url.searchParams.append("paymentType", paymentType);

      const res = await fetch(url.toString(), {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Failed to fetch courses");
      const data: Course[] = await res.json();
      setCourses(data);
    } catch (err) {
      console.error("Failed to load courses:", err);
      toast.error("Failed to load courses");
      setCourses([]);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, courseType, paymentType]);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  // ✅ Real-time updates via Socket.io
  useEffect(() => {
    const token = localStorage.getItem("token");
    const socket: Socket = io("http://localhost:5000", { auth: { token } });

    socket.on("connect", () => console.log("Socket connected:", socket.id));
    socket.on("courses:update", (updatedCourses: Course[]) => {
      setCourses(updatedCourses);
      toast.success("Courses updated in real-time!");
    });
    socket.on("connect_error", (err: Error) =>
      toast.error("Socket connection failed: " + err.message)
    );

    return () => {
      socket.disconnect();
    };
  }, []);

  // ✅ Handle "More Details" Click
  const handleMoreDetailsClick = (courseId: string) => {
    const token = localStorage.getItem("token");
    if (!token) {
      toast.error("Please register or log in to view course details.");
      setTimeout(() => navigate("/register"), 1000);
    } else {
      navigate(`/courses/${courseId}`);
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
          🎓 Available Courses
        </h1>
        <p className="text-gray-600 text-lg">
          Browse our course list — register to view more details.
        </p>
      </div>

      <div className="max-w-6xl mx-auto mb-6 flex flex-wrap gap-3 justify-center">
        <input
          type="text"
          placeholder="Search courses..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="border rounded-lg px-3 py-2 w-full sm:w-64"
        />
        <select
          value={courseType}
          onChange={(e) => setCourseType(e.target.value)}
          className="border rounded-lg px-3 py-2 w-full sm:w-44"
        >
          <option value="">All Types</option>
          {COURSE_TYPE_OPTIONS.map((type) => (
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
        <button
          onClick={() => {
            setSearchTerm("");
            setCourseType("");
            setPaymentType("");
          }}
          className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
        >
          Reset
        </button>
      </div>

      {/* ===== Course Cards ===== */}
      {courses.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {courses.map((course) => (
            <Card
              key={course._id}
              className="border border-blue-100 bg-white shadow-md hover:shadow-2xl transition-all duration-300 rounded-2xl"
            >
              <CardContent className="p-6 flex flex-col justify-between h-full">
                <div>
                  <h2 className="text-xl font-bold text-gray-800 mb-2 line-clamp-1">
                    {course.name || "Untitled Course"}
                  </h2>
                

                  {course.category && (
                    <p className="text-sm text-gray-600 mb-1">
                      Category: {course.category}
                    </p>
                  )}
                  {course.courseType && (
                    <p className="text-sm text-gray-600 mb-1">
                      Type: {course.courseType}
                    </p>
                  )}
                  {course.paymentType && (
                    <p className="text-sm text-gray-600 mb-1">
                      Payment: {course.paymentType}
                    </p>
                  )}
                  {course.duration && (
                    <p className="text-sm text-gray-500 mb-1">
                      Duration: {course.duration}
                    </p>
                  )}
                  {course.qualification && (
                    <p className="text-sm text-gray-500">
                      Qualification: {course.qualification}
                    </p>
                  )}
                </div>

                <button
                  onClick={() => handleMoreDetailsClick(course._id)}
                  className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-all duration-300 w-full"
                >
                  More Details
                </button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <p className="text-center text-gray-600 mt-8">
          No courses found.
        </p>
      )}
    </div>
  );
};

export default CoursePage;
