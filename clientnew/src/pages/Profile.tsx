import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import { Users, Save, Edit2 } from "lucide-react";
import { getToken, getUser, logout, setUser } from "@/utils/Auth";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SRI_LANKA_DISTRICTS } from "@/constants/srilankaDistricts";

interface UserProfile {
  _id: string;
  name: string;
  email: string;
  contactNumber?: string;
  location?: string;
  emailNotifications?: boolean;
}

const Profile: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUserState] = useState<UserProfile | null>(null);
  const [editedUser, setEditedUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  const fetchUserProfile = async () => {
    const currentUser = getUser();
    if (!currentUser) {
      logout();
      navigate("/login");
      return;
    }

    const userId = currentUser._id || currentUser.id;
    if (!userId) {
      logout();
      navigate("/login");
      return;
    }

    const token = getToken();
    if (!token) {
      logout();
      navigate("/login");
      return;
    }

    try {
      setLoading(true);
      const response = await axios.get<UserProfile>(`http://localhost:5000/api/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUserState(response.data);
      setEditedUser(response.data);
    } catch (error) {
      console.error("Failed to load profile", error);
      toast.error("Failed to load your profile. Please log in again.");
      logout();
      navigate("/login");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const handleChange = (field: keyof UserProfile, value: string) => {
    if (!editedUser) return;
    setEditedUser({ ...editedUser, [field]: value });
  };

  const handleSave = async () => {
    if (!editedUser || !user) return;
    const token = getToken();
    if (!token) {
      toast.error("Session expired. Please log in again.");
      logout();
      navigate("/login");
      return;
    }

    try {
      const response = await axios.put(`http://localhost:5000/api/users/${user._id}`, {
        contactNumber: editedUser.contactNumber,
        location: editedUser.location,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const updated = response.data.user;
      setUserState(updated);
      setEditedUser(updated);
      setUser(updated);
      toast.success("✅ Profile preferences saved successfully.");
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to save profile", error);
      toast.error("Failed to save profile. Please try again.");
    }
  };

  const handleUnsubscribe = async () => {
    if (!user) return;
    const token = getToken();
    if (!token) {
      toast.error("Session expired. Please log in again.");
      logout();
      navigate("/login");
      return;
    }

    try {
      const response = await axios.put(`http://localhost:5000/api/users/${user._id}/unsubscribe`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const updated = response.data.user;
      setUserState(updated);
      setEditedUser(updated);
      setUser(updated);
      toast.success("✅ Unsubscribed from email notifications successfully.");
    } catch (error) {
      console.error("Failed to unsubscribe", error);
      toast.error("Failed to unsubscribe. Please try again.");
    }
  };

  const handleSubscribe = async () => {
    if (!user) return;
    const token = getToken();
    if (!token) {
      toast.error("Session expired. Please log in again.");
      logout();
      navigate("/login");
      return;
    }

    try {
      const response = await axios.put(`http://localhost:5000/api/users/${user._id}/subscribe`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const updated = response.data.user;
      setUserState(updated);
      setEditedUser(updated);
      setUser(updated);
      toast.success("✅ Subscribed to email notifications successfully.");
    } catch (error) {
      console.error("Failed to subscribe", error);
      toast.error("Failed to subscribe. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-gray-500">Loading your profile...</p>
      </div>
    );
  }

  if (!user || !editedUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-red-500">Unable to load profile.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-slate-100">
      <Toaster position="top-right" />

      <div className="max-w-4xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
        <Card className="shadow-lg border border-slate-200">
          <CardHeader className="bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-t-lg">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-3 text-xl font-semibold">
                <Users className="w-5 h-5" /> Profile Preferences
              </CardTitle>
              <Button
                variant="secondary"
                onClick={() => (isEditing ? handleSave() : setIsEditing(true))}
                className="flex items-center gap-2"
              >
                {isEditing ? <Save size={16} /> : <Edit2 size={16} />}
                {isEditing ? "Save" : "Edit"}
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-6 p-6">
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-700">Name</label>
                <Input value={user.name} readOnly className="mt-2 bg-slate-100" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Email</label>
                <Input value={user.email} readOnly className="mt-2 bg-slate-100" />
              </div>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-700">Phone Number</label>
                <Input
                  value={editedUser.contactNumber || ""}
                  readOnly={!isEditing}
                  onChange={(e) => handleChange("contactNumber", e.target.value)}
                  className={`mt-2 ${isEditing ? "" : "bg-slate-100"}`}
                  placeholder="Add your phone number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">Preferred District</label>
                <select
                  value={editedUser.location || ""}
                  disabled={!isEditing}
                  onChange={(e) => handleChange("location", e.target.value)}
                  className={`mt-2 w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 ${
                    isEditing ? "border-slate-300" : "bg-slate-100 border-slate-200 cursor-not-allowed"
                  }`}
                >
                  <option value="">Select district</option>
                  {SRI_LANKA_DISTRICTS.map((district) => (
                    <option key={district} value={district}>
                      {district}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 p-4 border border-slate-200">
              <p className="text-sm text-slate-600">
                Your preferred district will be saved to your account and used to prefill the district filter in jobs and courses.
              </p>
            </div>

            <div className="rounded-xl bg-white p-4 border border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-slate-700">Email Notifications</h3>
                  <p className="text-sm text-slate-500">
                    Receive email alerts for new jobs and courses matching your profile.
                  </p>
                </div>
                {user.emailNotifications !== false ? (
                  <Button variant="destructive" onClick={handleUnsubscribe}>
                    Unsubscribe
                  </Button>
                ) : (
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-red-500 font-medium">Unsubscribed</span>
                    <Button variant="outline" className="border-sky-500 text-sky-600 hover:bg-sky-50" onClick={handleSubscribe}>
                      Subscribe
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {isEditing && (
              <div className="flex justify-end">
                <Button onClick={handleSave}>Save Preferences</Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Profile;
