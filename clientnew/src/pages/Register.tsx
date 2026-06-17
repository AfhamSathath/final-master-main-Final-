import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import toast, { Toaster } from "react-hot-toast";
import { Eye, EyeOff, CheckCircle, ArrowRight, ShieldCheck } from "lucide-react";
import { z } from "zod";
import {
  QUALIFICATION_OPTIONS,
  QUALIFICATION_CATEGORIES,
  QUALIFICATION_SUBOPTIONS,
  ALL_QUALIFICATION_OPTIONS,
  type QualificationCategory,
} from "@/constants/qualifications";
import { SRI_LANKA_DISTRICTS } from "@/constants/srilankaDistricts";
import { MultiSelectDropdown } from "@/components/MultiSelectDropdown";

// ------------------- API BASE -------------------
const API_BASE = "http://localhost:5000";

// ------------------- VALIDATION (zod) -------------------
const registerValidationSchema = z
  .object({
    name: z.string().min(2, "Name or Company Name is required"),
    email: z.string().email("Invalid email address"),
    phone: z.string().regex(/^\d{9,10}$/, "Phone number must be 9–10 digits"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Must contain at least one uppercase letter")
      .regex(/[a-z]/, "Must contain at least one lowercase letter")
      .regex(/\d/, "Must contain at least one number")
      .regex(/[@$!%*?&]/, "Must contain at least one special character"),
    confirmPassword: z.string().min(1, "Confirm password is required"),
    regNumber: z.string().optional(),
    address: z.string().optional(),
    qualificationCategory: z.union([
      // @ts-ignore
      z.enum(QUALIFICATION_CATEGORIES as any),
      z.literal("")
    ]).optional(),
    qualification: z.array(z.string()).optional(),
    district: z.string().min(1, "Please select your preferred district"),
    userType: z.enum(["user", "company"]),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })
  .refine(
    (data) => {
      if (data.userType === "company") {
        return !!data.regNumber && data.regNumber.trim().length > 0;
      }
      return true;
    },
    {
      message: "Registration number is required for companies",
      path: ["regNumber"],
    }
  )
  .refine(
    (data) => {
      if (data.userType === "user") {
        return !!data.qualification && data.qualification.length > 0;
      }
      return true;
    },
    {
      message: "Qualification is required for users",
      path: ["qualification"],
    }
  )
  .refine(
    (data) => {
      if (data.userType === "user") {
        return (
          !!data.qualification &&
          // @ts-ignore
          data.qualification.every((q) => ALL_QUALIFICATION_OPTIONS.includes(q as any))
        );
      }
      return true;
    },
    {
      message: "Please select a valid qualification",
      path: ["qualification"],
    }
  )
  .refine(
    (data) => {
      if (data.userType === "user") {
        const validCategories = QUALIFICATION_CATEGORIES;
        // @ts-ignore
        return !!data.qualificationCategory && validCategories.includes(data.qualificationCategory as any);
      }
      return true;
    },
    {
      message: "Please select a valid qualification category",
      path: ["qualificationCategory"],
    }
  );

interface RegisterData {
  name: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  regNumber?: string;
  address?: string;
  district?: string;

  qualificationCategory?: QualificationCategory | "";
  qualification?: string[];

  userType: "user" | "company";
}

const Register: React.FC = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState<RegisterData>({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    regNumber: "",
    address: "",
    district: "",
    qualificationCategory: "",
    qualification: [],

    userType: "user",
  });

  const [verified, setVerified] = useState(false);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [enteredOtp, setEnteredOtp] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isRegistrationComplete, setIsRegistrationComplete] = useState(false);
  const [brFile, setBrFile] = useState<File | null>(null);

  const qualificationOptions =
    formData.qualificationCategory &&
    (formData.qualificationCategory in QUALIFICATION_SUBOPTIONS)
      ? QUALIFICATION_SUBOPTIONS[formData.qualificationCategory as keyof typeof QUALIFICATION_SUBOPTIONS]
      : QUALIFICATION_OPTIONS;

  // ------------------- INPUT HANDLER -------------------
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
      ...(name === "qualificationCategory" ? { qualification: [] } : {}),
    }));
  };

  // ------------------- COMPANY VERIFICATION -------------------
  const verifyCompany = async () => {
    if (!formData.name.trim()) {
      toast.error("⚠️ Please enter your company name first!");
      return;
    }

    try {
      const toastId = toast.loading("🔍 Verifying company with database...");

      const response = await axios.post(`${API_BASE}/api/verify-company`, {
        companyName: formData.name,
        regNumber: formData.regNumber,
        email: formData.email,
        phone: formData.phone,
        checkDuplicate: true
      });

      toast.dismiss(toastId);

      if (response.data.duplicate) {
        toast.error(`❌ ${response.data.reason}`);
        setVerified(false);
        setConfidence(0);
        return;
      }

      if (response.data.verified) {
        toast.success(`✅ ${response.data.reason}`);
        setVerified(true);
        setConfidence(response.data.confidence);
      } else {
        toast.error(`❌ ${response.data.reason}`);
        setVerified(false);
        setConfidence(response.data.confidence);
      }
    } catch (err: any) {
      toast.dismiss();
      const errorMsg = err.response?.data?.reason || "Verification failed. Please try again.";
      toast.error(`❌ ${errorMsg}`);
      console.error("Verification error:", err);
      setVerified(false);
      setConfidence(null);
    }
  };

  // ------------------- DUPLICATE CHECK -------------------
  const checkDuplicate = async (): Promise<boolean> => {
    try {
      const payload: any = {
        email: formData.email,
        phone: formData.phone,
      };

      if (formData.userType === "company") {
        payload.name = formData.name;
        payload.regNumber = formData.regNumber;
        payload.userType = "company";
      }

      const res = await axios.post(`${API_BASE}/api/check-duplicate`, payload);

      if (res.data.exists) {
        toast.error(res.data.message || "⚠️ Email, phone, or registration number already in use!");
        return true;
      }

      return false;
    } catch (err) {
      console.error("Duplicate check error:", err);
      toast.error("❌ Failed to check duplicates.");
      return true;
    }
  };

  // ------------------- SEND OTP VIA EMAIL (NODEMAILER) -------------------
  const sendOtp = async () => {
    try {
      setLoading(true);
      
      const response = await axios.post(`${API_BASE}/api/auth/register-send-otp`, {
        email: formData.email,
        name: formData.name,
      });

      if (response.status === 200) {
        toast.success(`📩 OTP sent to ${formData.email}`);
        console.log("📨 Check server console for OTP (DEV MODE)");
        setOtpSent(true);
        setLoading(false);
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Failed to send OTP. Try again later.";
      toast.error(`❌ ${msg}`);
      console.error("Send OTP error:", err);
      setLoading(false);
    }
  };

  // ------------------- HANDLE SUBMIT -------------------
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg("");
    setLoading(true);

    try {
      const validation = registerValidationSchema.safeParse(formData);
      if (!validation.success) {
        const firstError = validation.error.errors[0];
        toast.error(`⚠️ ${firstError.message}`);
        setErrorMsg(firstError.message);
        setLoading(false);
        return;
      }

      if (formData.userType === "company" && !verified) {
        toast.error("⚠️ Please verify your company before registration.");
        setLoading(false);
        return;
      }

      const duplicateFound = await checkDuplicate();
      if (duplicateFound) {
        setLoading(false);
        return;
      }

      // Send OTP
      await sendOtp();
      setLoading(false);
    } catch (error: any) {
      const msg =
        error?.response?.data?.message ||
        error?.message ||
        "Registration failed. Please try again.";
      setErrorMsg(msg);
      toast.error(`❌ ${msg}`);
      console.error(error);
      setLoading(false);
    }
  };

  // ------------------- RESEND OTP -------------------
  const resendOtp = async () => {
    try {
      setLoading(true);
      
      const response = await axios.post(`${API_BASE}/api/auth/register-send-otp`, {
        email: formData.email,
        name: formData.name,
      });

      if (response.status === 200) {
        toast.success("📩 OTP resent successfully!");
        setEnteredOtp("");
        setLoading(false);
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Failed to resend OTP.";
      toast.error(`❌ ${msg}`);
      setLoading(false);
    }
  };

  // ------------------- VERIFY OTP AND REGISTER -------------------
  const verifyOtpAndRegister = async () => {
    if (!enteredOtp.trim()) {
      toast.error("❌ Please enter the OTP");
      return;
    }

    try {
      setLoading(true);

      // Step 1: Verify OTP with backend
      const verifyResponse = await axios.post(`${API_BASE}/api/auth/register-verify-otp`, {
        email: formData.email,
        otp: enteredOtp,
      });

      if (!verifyResponse.data.success) {
        toast.error("❌ Invalid OTP. Please try again.");
        setLoading(false);
        return;
      }

      // Step 2: Register user or company
      if (formData.userType === "company") {
        if (!brFile) {
          toast.error("❌ Please upload your BR certificate.");
          setLoading(false);
          return;
        }

        const data = new FormData();
        data.append("name", formData.name);
        data.append("location", formData.district || "Sri Lanka");
        data.append("address", formData.address || "");
        data.append("regNumber", formData.regNumber || "");
        data.append("email", formData.email);
        data.append("contactNumber", formData.phone);
        data.append("password", formData.password);
        data.append("document", brFile);

        const response = await axios.post(`${API_BASE}/api/companies`, data, {
          headers: { "Content-Type": "multipart/form-data" }
        });

        if (response.status === 201) {
          toast.success("🏢 Company registered successfully!", { duration: 5000 });
          setOtpSent(false); // Reset to show registration success state
          setIsRegistrationComplete(true);
          return;
        }
      } else {
        const response = await axios.post(`${API_BASE}/api/users`, {
          name: formData.name,
          role: "user",
          email: formData.email,
          contactNumber: formData.phone,
          location: formData.district,
          qualificationCategory: formData.qualificationCategory,
          qualification: formData.qualification,
          password: formData.password,
        });

        if (response.status === 201) {
          toast.success("🎉 User registered successfully!");
          setTimeout(() => navigate("/login"), 1500);
          return;
        }
      }
    } catch (error: any) {
      const msg =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to complete registration.";
      toast.error(`❌ ${msg}`);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // ------------------- UI -------------------
  return (
    <>
      <Toaster position="top-center" reverseOrder={false} />
 
      {isRegistrationComplete ? (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-100 to-blue-200 p-4 font-sans">
          <div className="w-full max-w-lg bg-white p-10 rounded-3xl shadow-2xl border border-gray-100 text-center animate-in zoom-in duration-300">
            <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
            <h2 className="text-3xl font-black text-slate-800 mb-4 tracking-tight">Registration Received!</h2>
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 mb-8 text-left shadow-sm">
              <div className="flex gap-4">
                <ShieldCheck className="w-8 h-8 text-amber-500 shrink-0" />
                <div>
                  <h4 className="font-bold text-amber-900 mb-1">Account Pending Verification</h4>
                  <p className="text-amber-800 text-sm leading-relaxed">
                    Thank you for joining the QJC network. To ensure platform integrity, our administrators must manually verify your business credentials.
                  </p>
                </div>
              </div>
            </div>
            
            <p className="text-slate-600 mb-10 text-lg">
              You will receive an email notification once your account has been reviewed. 
              <span className="block font-bold mt-2 text-slate-800 italic underline decoration-red-400 decoration-2">
                Note: You will not be able to login until this verification is complete.
              </span>
            </p>
            
            <button
              onClick={() => navigate("/login")}
              className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-slate-800 transition shadow-lg shadow-slate-900/10 active:scale-95"
            >
              Back to Login <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      ) : !otpSent ? (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 to-blue-300 p-4">
          <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-2xl border border-gray-200">
            <h2 className="text-3xl font-bold text-center text-blue-700 mb-6">
              Create Your Account
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name / Company */}
              <div>
                <label className="block text-sm font-semibold mb-1 text-gray-700">
                  Full Name / Company Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-400"
                  placeholder="Enter your full name or company name"
                />
              </div>

              {/* User Type */}
              <div>
                <label className="block text-sm font-semibold mb-1 text-gray-700">
                  Account Type
                </label>
                <select
                  name="userType"
                  value={formData.userType}
                  onChange={handleChange}
                  className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-400"
                >
                  <option value="user">User</option>
                  <option value="company">Company</option>
                </select>
              </div>

              {/* Company-specific fields */}
              {formData.userType === "company" && (
                <>
                  <div>
                    <label className="block text-sm font-semibold mb-1 text-gray-700">
                      Registration Number
                    </label>
                    <input
                      type="text"
                      name="regNumber"
                      value={formData.regNumber}
                      onChange={handleChange}
                      required
                      className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-400"
                      placeholder="e.g., PV/1234/2022"
                    />
                  </div>

                  <div className="flex items-center justify-between mt-2">
                    <button
                      type="button"
                      onClick={verifyCompany}
                      className={`px-4 py-2 rounded-md font-semibold text-white ${
                        verified ? "bg-green-600" : "bg-blue-600"
                      } hover:opacity-90`}
                    >
                      {verified ? "Verified ✅" : "Verify Company"}
                    </button>
                    {confidence !== null && (
                      <span
                        className={`text-sm font-medium ${
                          verified ? "text-green-700" : "text-red-600"
                        }`}
                      >
                        Confidence: {(confidence * 100).toFixed(0)}%
                      </span>
                    )}
                  </div>
                </>
              )}

              {/* Email */}
              <div>
                <label className="block text-sm font-semibold mb-1 text-gray-700">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-400"
                  placeholder="Enter your email"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-semibold mb-1 text-gray-700">
                  Phone Number
                </label>
                <input
                  type="text"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                  className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-400"
                  placeholder="Enter your phone number"
                />
              </div>

              {/* Preferred District */}
              <div>
                <label className="block text-sm font-semibold mb-1 text-gray-700">
                  Preferred District
                </label>
                <select
                  name="district"
                  value={formData.district}
                  onChange={handleChange}
                  className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-400"
                >
                  <option value="">Select your district</option>
                  {SRI_LANKA_DISTRICTS.map((district) => (
                    <option key={district} value={district}>
                      {district}
                    </option>
                  ))}
                </select>
              </div>

              {/* Qualification for user */}
              {formData.userType === "user" && (
                <>
                  <div>
                    <label className="block text-sm font-semibold mb-1 text-gray-700">
                      Qualification category
                    </label>
                    <select
                      name="qualificationCategory"
                      value={formData.qualificationCategory || ""}
                      onChange={handleChange}
                      required
                      className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-400"
                    >
                      <option value="">Select category</option>
                      {QUALIFICATION_CATEGORIES.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-1 text-gray-700">
                      Qualification(s)
                    </label>
                    <MultiSelectDropdown
                      options={qualificationOptions}
                      selectedValues={formData.qualification || []}
                      onChange={(selected: string[]) => setFormData({ ...formData, qualification: selected })}
                      placeholder="Select your qualification(s)"
                    />
                  </div>
                </>
              )}


              <div className="relative">
                <label className="block text-sm font-semibold mb-1 text-gray-700">
                  Password
                </label>
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-400 pr-10"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-8 text-gray-500"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {/* Confirm Password */}
              <div className="relative">
                <label className="block text-sm font-semibold mb-1 text-gray-700">
                  Confirm Password
                </label>
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-400 pr-10"
                  placeholder="Re-enter your password"
                />
                <button
                  type="button"
                  onClick={() =>
                    setShowConfirmPassword(!showConfirmPassword)
                  }
                  className="absolute right-2 top-8 text-gray-500"
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {/* Address */}
              {formData.userType === "company" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold mb-1 text-gray-700">
                      Address
                    </label>
                    <input
                      type="text"
                      name="address"
                      value={formData.address}
                      onChange={handleChange}
                      className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-400"
                      placeholder="Enter company address"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-1 text-gray-700">
                      Business Registration (BR) Certificate
                    </label>
                    <input
                      type="file"
                      id="br-cert"
                      accept=".pdf,.jpg,.jpeg,.png"
                      required
                      onChange={(e) => setBrFile(e.target.files?.[0] || null)}
                      className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                    <p className="text-[10px] text-gray-500 mt-1 italic">Please upload a clear copy of your registration certificate (.pdf, .jpg, .png)</p>
                  </div>
                </div>
              )}

              {errorMsg && (
                <p className="text-red-600 text-sm text-center">{errorMsg}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition font-semibold shadow-md disabled:opacity-60"
              >
                {loading ? "Processing..." : "Register"}
              </button>


               {/* ✅ Added login link to OTP screen too */}
            <p className="text-sm text-gray-600 mt-4">
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => navigate("/login")}
                className="text-blue-600 font-semibold hover:underline"
              >
                Go to Login
              </button>
            </p>

            </form>
          </div>
        </div>
      ) : (
        // OTP Screen
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-100 to-green-300 p-4">
          <div className="w-full max-w-sm bg-white p-8 rounded-2xl shadow-xl text-center">
            <h2 className="text-2xl font-bold text-green-700 mb-3">
              Verify Your Email
            </h2>
            <p className="text-gray-600 mb-4">
              We've sent a 6-digit OTP to <strong>{formData.email}</strong>
            </p>

            <input
              type="text"
              value={enteredOtp}
              onChange={(e) => setEnteredOtp(e.target.value)}
              maxLength={6}
              className="w-full p-3 border rounded-md text-center text-lg tracking-widest focus:ring-2 focus:ring-green-400"
              placeholder="Enter OTP"
            />

            <button
              type="button"
              onClick={verifyOtpAndRegister}
              disabled={loading}
              className="w-full mt-4 bg-green-600 text-white py-2 rounded-md hover:bg-green-700 transition font-semibold shadow-md disabled:opacity-60"
            >
              {loading ? "Verifying..." : "Verify & Register"}
            </button>

            <button
              type="button"
              onClick={resendOtp}
              disabled={loading}
              className="mt-3 text-blue-600 font-medium hover:underline disabled:opacity-60"
            >
              {loading ? "Sending..." : "Resend OTP"}
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default Register;
