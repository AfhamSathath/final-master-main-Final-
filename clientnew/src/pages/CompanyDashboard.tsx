import React, { useState, useEffect } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { getUser, logout, getToken } from "@/utils/Auth";
import ProtectedRoute from "@/components/ProtectedRoute";
import { io, Socket } from "socket.io-client";
import { toast } from "sonner";

const CompanyDashboard: React.FC = () => {
  const navigate = useNavigate();
  const user = getUser();
  const [isOpen, setIsOpen] = useState(true);

  useEffect(() => {
    if (!user) return;
    const userId = user._id || user.id;
    if (!userId) return;

    const socket: Socket = io("http://localhost:5000", {
       auth: { token: getToken() }
    });

    socket.emit("join", userId);

    socket.on("newNotification", (notification: any) => {
       console.log("🔔 New Notification:", notification.title);
       
       // ✅ Visual Toast
       toast(notification.title, {
          description: notification.message,
          duration: 5000,
       });

       try {
         const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3");
         audio.volume = 0.5;
         audio.play().catch(e => console.log("Sound play deferred", e));
       } catch (e) {
         console.error("Audio failed", e);
       }
    });

    return () => { socket.disconnect(); };
  }, [user]);


  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const activeClass = "bg-blue-600 text-white";
  const inactiveClass = "text-gray-700 hover:bg-blue-100";

  return (
    <ProtectedRoute allowedRoles={["company"]}>
      <div className="flex h-screen">
        {/* Sidebar */}
        <div
          className={`bg-gray-100 p-6 flex flex-col transition-all duration-300 ${
            isOpen ? "w-64" : "w-16"
          }`}
        >
          <button
            className="mb-4 bg-gray-300 p-2 rounded hover:bg-gray-400"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? "⏪" : "⏩"}
          </button>

          {isOpen && (
            <>
              <h2 className="text-2xl font-bold mb-6">Company Panel</h2>
              <p className="mb-6">
                Welcome, {user?.name || "Company"}
              </p>
            </>
          )}

          <nav className="flex flex-col gap-2">
           

            <NavLink
              to="/company-dashboard/profile"
              className={({ isActive }) =>
                (isActive ? activeClass : inactiveClass) + " p-2 rounded"
              }
            >
              {isOpen ? "Company Profile" : "🏢"}
            </NavLink>

            <NavLink
              to="/company-dashboard/jobs"
              className={({ isActive }) =>
                (isActive ? activeClass : inactiveClass) + " p-2 rounded"
              }
            >
              {isOpen ? "Manage Jobs" : "💼"}
            </NavLink>

            <NavLink
              to="/company-dashboard/courses"
              className={({ isActive }) =>
                (isActive ? activeClass : inactiveClass) + " p-2 rounded"
              }
            >
              {isOpen ? "View Courses" : "📋"}
            </NavLink>

            <button
              onClick={handleLogout}
              className={`mt-4 bg-red-600 text-white px-4 py-2 rounded transition-all duration-300 ${
                isOpen ? "" : "w-10 p-2 text-sm"
              }`}
            >
              {isOpen ? "Logout" : "❌"}
            </button>
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 bg-white p-8 overflow-auto">
          <Outlet />
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default CompanyDashboard;
