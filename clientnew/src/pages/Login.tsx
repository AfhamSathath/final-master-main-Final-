import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import { Eye, EyeOff, Mail, Sparkles, ShieldCheck, XCircle } from "lucide-react";
import { setToken, setUser } from "@/utils/Auth";
import { io } from "socket.io-client";


const API_BASE = "http://localhost:5000";

interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
  token?: string;
  location?: string;
  contactNumber?: string;
}

const fetchUserDetails = async (id: string, token: string) => {
  const response = await axios.get(`${API_BASE}/api/users/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

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
  const [magicLinkStatus, setMagicLinkStatus] = useState<"waiting" | "verified" | "error">("waiting");

  // ✅ REAL-TIME Scenario Listener
  useEffect(() => {
    let socket: any;
    if (step === 2 && loginType === "magic-link") {
      console.log("🔌 Connecting to socket for real-time login...");
      socket = io(API_BASE);
      
      socket.emit("join", emailForOTP.toLowerCase().trim());
      
      // ✅ Listen for OTP Sent Confirmation (with sound)
      socket.on("otp-sent", (data: any) => {
        console.log("⚡ [Socket] OTP Sent successfully to:", data.email);
        playAlertSound(); // Trigger sound confirm
      });

      socket.on("magic-link-verified", (data: any) => {
        console.log("⚡ [Socket] Magic link verified! Logging in...");
        setMagicLinkStatus("verified");

        // ✅ Play Success Alert Sound
        try {
          const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3");
          audio.volume = 0.5;
          audio.play().catch(err => console.log("Audio play deferred", err));
        } catch (err) {
          console.error("Failed to play sound:", err);
        }
        
        setTimeout(async () => {
           const { token, _id, name, email, role } = data;
           setToken(token);

           if (role === "user") {
             const fullUser = await fetchUserDetails(_id, token);
             setUser({ ...fullUser, token });
           } else {
             setUser({ _id, name, email, role, token });
           }

           navigate(role === "admin" ? "/admin-dashboard" : role === "company" ? "/company-dashboard" : "/user-dashboard");
        }, 1500); // 1.5s delay for cool effect
      });
    }

    return () => {
      if (socket) {
        console.log("🔌 Disconnecting socket...");
        socket.disconnect();
      }
    };
  }, [step, loginType, emailForOTP, navigate]);

  // ✅ Play Alert Sound Helper
  const playAlertSound = (url = "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3") => {
    try {
      const audio = new Audio(url);
      audio.volume = 0.4;
      audio.play().catch(err => console.log("Audio play deferred", err));
    } catch (err) {
      console.error("Failed to play sound:", err);
    }
  };


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
      // ✅ If using magic link without password, call the new passwordless endpoint
      if (useMagicLink && !formData.password) {
        const magicRes = await axios.post(`${API_BASE}/api/auth/request-magic-link`, {
          email: formData.email
        });
        
        if (magicRes.data.success) {
           setEmailForOTP(formData.email);
           setLoginType("magic-link");
           setStep(2);
           setMagicLinkStatus("waiting");
           playAlertSound(); // ✅ Play Sent sound
           return;
        }
      }

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

           if (role === "user") {
             const fullUser = await fetchUserDetails(_id, token);
             setUser({ ...fullUser, token });
           } else {
             setUser({ _id, name, email, role, token });
           }

           navigate(role === "admin" ? "/admin-dashboard" : role === "company" ? "/company-dashboard" : "/user-dashboard");
           return;
        }

        setEmailForOTP(formData.email);
        setLoginType(useMagicLink ? "magic-link" : "otp");
        setStep(2);
        if (useMagicLink) setMagicLinkStatus("waiting");
        playAlertSound(); // ✅ Play Sent sound
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
        let storedUser = userData;
        if (userData.role === "user") {
          const fullUser = await fetchUserDetails(userData._id, token);
          storedUser = { ...fullUser, token };
        }

        setUser(storedUser);

        // Redirect based on role
        if (storedUser.role === "admin") {
          navigate("/admin-dashboard");
        } else if (storedUser.role === "company") {
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
              <div className={`rounded-xl border p-5 mt-6 animate-in fade-in slide-in-from-top-4 duration-300 ${
                error.includes("pending") || error.includes("rejected") || error.includes("suspended")
                ? "bg-amber-50 border-amber-200" 
                : "bg-red-50 border-red-200"
              }`}>
                <div className="flex gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    {error.includes("🏢") || error.includes("pending") ? (
                      <ShieldCheck className="h-5 w-5 text-amber-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                  </div>
                  <div>
                    <h3 className={`text-sm font-bold ${
                      error.includes("pending") || error.includes("rejected") || error.includes("suspended")
                      ? "text-amber-900" 
                      : "text-red-900"
                    }`}>
                      {error.includes("pending") ? "Account Verification Required" : 
                       error.includes("rejected") ? "Account Verification Rejected" : 
                       error.includes("suspended") ? "Account Suspended" : "Authentication Error"}
                    </h3>
                    <div className={`mt-1 text-sm ${
                      error.includes("pending") || error.includes("rejected") || error.includes("suspended")
                      ? "text-amber-700" 
                      : "text-red-700"
                    }`}>
                      {error}
                    </div>
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
            <div className="p-10 bg-white rounded-2xl shadow-xl border border-gray-100 flex flex-col items-center">
              {magicLinkStatus === "waiting" ? (
                <>
                  <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-6 relative">
                    <Mail className="w-10 h-10 text-blue-600 animate-bounce" />
                    <div className="absolute inset-0 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Check your email</h3>
                  <p className="text-gray-500 mb-8 max-w-xs">
                    We've sent a <strong>Magic Login Link</strong> to <br />
                    <span className="text-blue-600 font-semibold">{emailForOTP}</span>
                  </p>
                  
                  <div className="bg-gray-50 p-6 rounded-xl border border-dashed border-gray-200 mb-8 w-full flex flex-col items-center gap-3">
                    <Sparkles className="w-5 h-5 text-yellow-500 animate-pulse" />
                    <p className="text-sm text-gray-600 font-medium italic">
                      Real-time Scenario: Don't refresh! Once you click "It's Me" in the email, this page will automatically redirect.
                    </p>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center py-6">
                  <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mb-6 scale-125 transition-transform duration-500">
                    <ShieldCheck className="w-12 h-12 text-green-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-green-600 mb-2">Verified!</h3>
                  <p className="text-gray-600">Redirecting to your dashboard...</p>
                </div>
              )}

              <button
                type="button"
                onClick={() => setStep(1)}
                className="w-full flex justify-center py-3 px-4 border border-gray-300 text-sm font-medium rounded-xl text-gray-700 bg-white hover:bg-gray-50 focus:outline-none transition-all"
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