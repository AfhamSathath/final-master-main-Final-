import React, { useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import axios from "axios";

/**
 * MagicLogin Page
 * Handles the "It's Me" one-click login from email.
 * Environment-ready for QJC.
 */
const MagicLogin: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const token = searchParams.get("token");
  const email = searchParams.get("email");

  useEffect(() => {
    const handleMagicLogin = async () => {
      if (!token || !email) {
        toast.error("Invalid login link.");
        navigate("/login");
        return;
      }

      try {
        const response = await axios.get(
          `${import.meta.env.VITE_API_BASE_URL || "http://localhost:5000"}/api/auth/magic-login`,
          { params: { token, email } }
        );

        if (response.data.success) {
          const { token: authToken, _id, name, email: userEmail, role } = response.data;

          // Store authentication data
          localStorage.setItem("authToken", authToken);
          localStorage.setItem("user", JSON.stringify({ _id, name, email: userEmail, role }));

          toast.success(`Welcome back, ${name}!`);

          // Redirect to appropriate dashboard
          const dashboardPath = role === "admin"
            ? "/admin-dashboard"
            : role === "company"
              ? "/company-dashboard"
              : "/user-dashboard";

          navigate(dashboardPath, { replace: true });
        } else {
          toast.error(response.data.message || "Failed to authenticate.");
          navigate("/login");
        }
      } catch (error: any) {
        console.error("Magic Login Error:", error);
        toast.error(error.response?.data?.message || "Login link expired or invalid.");
        navigate("/login");
      }
    };

    handleMagicLogin();
  }, [token, email, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 flex-col">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
      <h2 className="text-xl font-semibold text-gray-700">Verifying your identity...</h2>
      <p className="text-gray-500 mt-2">Please wait while we log you in securely.</p>
    </div>
  );
};

export default MagicLogin;
