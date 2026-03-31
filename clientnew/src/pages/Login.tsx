// src/pages/Login.tsx
import React, { useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { setToken, setUser } from "@/utils/Auth";


const API_BASE = "http://localhost:5000";

interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
  token?: string;
}

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: "",
    password: ""
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState(1); // 1: Login, 2: OTP
  const [otp, setOtp] = useState("");
  const [emailForOTP, setEmailForOTP] = useState("");
  const [loginType, setLoginType] = useState<"otp" | "magic-link">("otp");


  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleLogin = async (e: React.FormEvent, useMagicLink: boolean = false) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const loginRes = await axios.post(`${API_BASE}/api/auth/login`, {
        email: formData.email,
        password: formData.password,
        useMagicLink
      });

      if (loginRes.data.success) {
        if (loginRes.data.token) {
           // Direct login (otpRequired was false)
           const { token, _id, name, email, role } = loginRes.data;
           setToken(token);
           setUser({ _id, name, email, role, token });
           navigate(role === "admin" ? "/admin-dashboard" : role === "company" ? "/company-dashboard" : "/user-dashboard");
           return;
        }

        setEmailForOTP(formData.email);
        setLoginType(useMagicLink ? "magic-link" : "otp");
        setStep(2);
      } else {
        throw new Error(loginRes.data.message || "Failed to initiate login");
      }
    } catch (err: any) {
      console.error("Login failed:", err);
      setError(err.response?.data?.message || err.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const verifyRes = await axios.post(`${API_BASE}/api/auth/login-verify-otp`, {
        email: emailForOTP,
        otp
      });

      if (verifyRes.data.success) {
        const { token } = verifyRes.data;
        const user = verifyRes.data;

        setToken(token);
        
        const userData: User = {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          token: token
        };
        setUser(userData);

        // Redirect based on role
        if (userData.role === "admin") {
          navigate("/admin-dashboard");
        } else if (userData.role === "company") {
          navigate("/company-dashboard");
        } else {
          navigate("/user-dashboard");
        }
      } else {
        throw new Error(verifyRes.data.message || "Invalid OTP");
      }
    } catch (err: any) {
      console.error("OTP verification failed:", err);
      setError(
        err.response?.data?.message ||
        err.message ||
        "Verification failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {step === 1 ? "Sign in to your account" : "Verify your identity"}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {step === 1 ? (
              <>
                Or{" "}
                <Link
                  to="/register"
                  className="font-medium text-blue-600 hover:text-blue-500"
                >
                  create a new account
                </Link>
              </>
            ) : (
              `An OTP has been sent to ${emailForOTP}`
            )}
          </p>
        </div>

        {step === 1 ? (
          <form className="mt-8 space-y-6" onSubmit={handleLogin}>
            <div className="rounded-md shadow-sm -space-y-px">
              <div className="mb-4">
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="appearance-none rounded relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Enter your email"
                />
              </div>

              <div className="mb-4">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    className="appearance-none rounded relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm pr-10"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {error && (
              <div className="rounded-md bg-red-50 p-4 mt-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">{error}</h3>
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-3">
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Signing in..." : "Sign in"}
              </button>
              
              <button
                type="button"
                onClick={(e) => handleLogin(e, true)}
                disabled={loading}
                className="group relative w-full flex justify-center py-2 px-4 border border-blue-600 text-sm font-medium rounded-md text-blue-600 bg-white hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Sending link..." : "Sign in via Email (Magic Link)"}
              </button>
            </div>

            <div className="text-center">
              <Link
                to="/forgot-password"
                className="font-medium text-blue-600 hover:text-blue-500 text-sm"
              >
                Forgot your password?
              </Link>
            </div>
          </form>
        ) : loginType === "otp" ? (
          <form className="mt-8 space-y-6" onSubmit={handleVerifyOTP}>
            <div className="rounded-md shadow-sm -space-y-px">
              <div className="mb-4">
                <label htmlFor="otp" className="block text-sm font-medium text-gray-700 mb-1">
                  Verification Code
                </label>
                <input
                  id="otp"
                  name="otp"
                  type="text"
                  required
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="appearance-none rounded relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm text-center tracking-widest font-bold text-2xl"
                  placeholder="000000"
                  maxLength={6}
                />
              </div>
            </div>

            {error && (
              <div className="rounded-md bg-red-50 p-4 mt-4">
                <h3 className="text-sm font-medium text-red-800">{error}</h3>
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Verifying..." : "Verify OTP"}
              </button>
            </div>

            <div className="text-center">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="font-medium text-blue-600 hover:text-blue-500 text-sm"
              >
                Back to Sign in
              </button>
            </div>
          </form>
        ) : (
          <div className="mt-8 text-center space-y-6">
            <div className="p-10 bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col items-center">
              <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-6">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Check your email</h3>
              <p className="text-gray-500 mb-8 max-w-xs">
                We've sent a secure "It's Me" login link to <strong>{emailForOTP}</strong>.
              </p>
              <div className="animate-pulse flex space-x-2 mb-8">
                <div className="h-2 w-2 bg-blue-400 rounded-full"></div>
                <div className="h-2 w-2 bg-blue-400 rounded-full"></div>
                <div className="h-2 w-2 bg-blue-400 rounded-full"></div>
              </div>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="w-full flex justify-center py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
              >
                Back to Login
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default Login;