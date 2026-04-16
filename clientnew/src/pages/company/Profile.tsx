// src/pages/company/Profile.tsx
import React, { useEffect, useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { getUser, getToken, logout } from "@/utils/Auth";
import { useNavigate } from "react-router-dom";
import { Users, Briefcase, Edit2, Save } from "lucide-react";
import { io, Socket } from "socket.io-client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import toast, { Toaster } from "react-hot-toast";
import axios from "axios";

interface Company {
  _id: string;
  name: string;
  email: string;
  regNumber: string;
  contactNumber: string;
  location: string;
  verificationStatus: "pending" | "verified" | "rejected";
  rejectionReason?: string;
  joinedDate?: string;
}

const CompanyProfile: React.FC = () => {
  const navigate = useNavigate();
  const [company, setCompany] = useState<Company | null>(null);
  const [editedCompany, setEditedCompany] = useState<Company | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch company profile
  const fetchCompany = async () => {
    try {
      const user = getUser();
      if (!user) {
        toast.error("⚠ You are not logged in! Redirecting to login...");
        logout();
        navigate("/login");
        return;
      }

      const userId = user.id || user._id;
      if (!userId) {
        toast.error("⚠ Invalid user. Redirecting to login...");
        logout();
        navigate("/login");
        return;
      }

      const token = getToken();
      if (!token) {
        toast.error("⚠ Session expired. Redirecting to login...");
        logout();
        navigate("/login");
        return;
      }

      const response = await axios.get<Company>(
        `http://localhost:5000/api/companies/${userId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setCompany(response.data);
      setEditedCompany(response.data);
      setLoading(false);
      // toast.success("✅ Profile loaded successfully!");
    } catch (error) {
      console.error("Failed to fetch company:", error);
      toast.error("❌ Failed to load company profile. Please try again.");
      setLoading(false);
    }
  };

  // Initialize Socket.IO
  useEffect(() => {
    const user = getUser();
    const userId = user?.id || user?._id;
    if (!userId) return;

    fetchCompany();

    const newSocket: Socket = io("http://localhost:5000", {
      auth: { token: getToken() },
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 2000,
    });

    newSocket.on("connect_error", (err) => {
      if (err instanceof Error && err.message.includes("invalid token")) {
        toast.error("⚠ Session expired. Please login again.");
        logout();
        navigate("/login");
      }
    });

    newSocket.on("companyProfileUpdate", (updated: Partial<Company>) => {
      setCompany((prev) => (prev ? { ...prev, ...updated } : prev));
      setEditedCompany((prev) => (prev ? { ...prev, ...updated } : prev));
      toast.success("✅ Company profile updated successfully!");
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [navigate]);

  const isVerified = company?.verificationStatus === "verified";

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={["company"]}>
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-gray-500">Loading company profile...</p>
        </div>
      </ProtectedRoute>
    );
  }

  if (!company || !editedCompany) {
    return (
      <ProtectedRoute allowedRoles={["company"]}>
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-red-500">Failed to load profile.</p>
        </div>
      </ProtectedRoute>
    );
  }

  const handleChange = (field: keyof Company, value: string) => {
    setEditedCompany({ ...editedCompany, [field]: value });
  };

  const handleSave = async () => {
    if (!editedCompany) return;

    const confirmSave = window.confirm("Are you sure you want to save changes?");
    if (!confirmSave) return;

    try {
      const token = getToken();
      await axios.put(
        `http://localhost:5000/api/companies/${company._id}`,
        {
          contactNumber: editedCompany.contactNumber,
          location: editedCompany.location,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCompany(editedCompany);
      toast.success("✅ Company profile updated successfully!");
      setIsEditing(false);
    } catch (error) {
      console.error(error);
      toast.error("❌ Error saving profile. Please try again.");
    }
  };

  return (
    <ProtectedRoute allowedRoles={["company"]}>
      <div className="min-h-screen bg-gray-100">
        <Toaster position="top-right" reverseOrder={false} />

        <header className="sticky top-0 bg-gradient-to-r from-green-600 to-indigo-700 text-white shadow-lg z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <Briefcase className="h-8 w-8 text-white" />
              <span className="text-2xl font-bold tracking-tight">QJC Partner Panel</span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-white font-medium">Hello, {company.name}</span>
            </div>
          </div>
        </header>

        <main className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          {/* Verification Warning */}
          {!isVerified && (
            <div className="mb-8 bg-amber-50 border-l-4 border-amber-500 p-6 rounded-2xl shadow-md animate-in slide-in-from-top-4 duration-500">
              <div className="flex items-start">
                <div className="flex-shrink-0 bg-amber-100 p-2 rounded-lg">
                  <svg className="h-6 w-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-bold text-amber-900">
                    Account Verification Required
                  </h3>
                  <div className="mt-1 text-sm text-amber-800 leading-relaxed">
                    <p>
                      {company.verificationStatus === "pending" 
                        ? "Your business profile is currently awaiting administrative approval. Profile editing is disabled during this period to ensure data consistency."
                        : `Your account verification was rejected. Reason: ${company.rejectionReason || "None provided"}. Please contact support for assistance.`}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <Card className={`shadow-xl border-0 overflow-hidden rounded-3xl transition-all duration-300 ${!isVerified ? 'opacity-90' : ''}`}>
            <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b flex flex-row justify-between items-center py-8 px-10">
              <div>
                <CardTitle className="flex items-center text-slate-800 text-2xl font-black">
                  <Users className="w-8 h-8 mr-4 text-indigo-600" /> Company Profile
                </CardTitle>
                <p className="text-slate-500 text-sm mt-1 ml-12 font-medium">Manage your corporate credentials and location.</p>
              </div>
              <Button
                variant={isEditing ? "default" : "outline"}
                size="lg"
                disabled={!isVerified}
                onClick={() => {
                  if (!isVerified) {
                    toast.error("Account verification required to edit profile.");
                    return;
                  }
                  isEditing ? handleSave() : setIsEditing(true);
                }}
                className={`flex items-center gap-3 rounded-2xl font-bold px-8 ${isEditing ? 'bg-indigo-600 hover:bg-indigo-700' : 'border-2'}`}
              >
                {isEditing ? <Save className="w-5 h-5" /> : <Edit2 className="w-5 h-5" />}
                {isEditing ? "Save Changes" : "Edit Profile"}
              </Button>
            </CardHeader>

            <CardContent className="p-10 space-y-8">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (isEditing) handleSave();
                }}
                className="grid gap-8"
              >
                <div className="grid md:grid-cols-2 gap-8">
                  {(["name", "email", "regNumber"] as (keyof Company)[]).map((field) => (
                    <div className="flex flex-col gap-2" key={field}>
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">
                        {field === "regNumber"
                          ? "Business Reg Number"
                          : field.charAt(0).toUpperCase() + field.slice(1)}
                      </label>
                      <Input 
                        value={company[field]} 
                        readOnly 
                        className="bg-slate-50 border-slate-200 text-slate-600 font-bold h-12 rounded-xl focus:ring-0 cursor-not-allowed shadow-inner" 
                      />
                    </div>
                  ))}

                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Joined Date</label>
                    <Input
                      value={company.joinedDate ? new Date(company.joinedDate).toLocaleDateString() : "N/A"}
                      readOnly
                      className="bg-slate-50 border-slate-200 text-slate-600 font-bold h-12 rounded-xl focus:ring-0 cursor-not-allowed shadow-inner"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-8 pt-6 border-t border-slate-100">
                  {(["contactNumber", "location"] as (keyof Company)[]).map((field) => (
                    <div className="flex flex-col gap-2" key={field}>
                      <label className="text-xs font-black text-indigo-600 uppercase tracking-widest ml-1">
                        {field === "contactNumber" ? "Corporate Contact" : "Main Operation Base"}
                      </label>
                      <Input
                        value={isEditing ? editedCompany[field] : company[field]}
                        readOnly={!isEditing}
                        onChange={(e) => handleChange(field, e.target.value)}
                        placeholder={`Enter ${field}`}
                        className={`h-12 rounded-xl font-bold transition-all duration-300 ${
                          isEditing 
                          ? "border-indigo-400 ring-4 ring-indigo-50 bg-white" 
                          : "bg-slate-50 border-slate-200 text-slate-600 cursor-not-allowed shadow-inner"
                        }`}
                      />
                    </div>
                  ))}
                </div>

                {isEditing && <button type="submit" className="hidden"></button>}
              </form>
            </CardContent>
          </Card>
        </main>
      </div>
    </ProtectedRoute>
  );
};

export default CompanyProfile;
