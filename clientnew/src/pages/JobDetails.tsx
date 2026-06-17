import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Briefcase, MapPin, CalendarDays, GraduationCap } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

interface Job {
  _id: string;
  title: string;
  company?: string;
  description?: string;
  qualification?: string[];
  openDate?: string;
  closeDate?: string;
  category?: string;
  positionType?: "full-time" | "part-time" | "internship";
  paymentType?: "paid" | "unpaid";
  location?: string;
}

const API_BASE_URL = "http://localhost:5000/api/jobs";

const JobDetails: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const fetchJob = async () => {
      if (!id) {
        setErrorMessage("Job not found.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setErrorMessage("");

      try {
        const token = localStorage.getItem("token");
        const response = await fetch(`${API_BASE_URL}/${id}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        if (!response.ok) {
          throw new Error(response.status === 404 ? "Job not found." : "Failed to load job details.");
        }

        const data: Job = await response.json();
        setJob(data);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to load job details.";
        setErrorMessage(message);
        setJob(null);
        toast.error(message);
      } finally {
        setLoading(false);
      }
    };

    fetchJob();
  }, [id]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <Toaster position="top-center" />
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 px-4 py-8 md:px-10">
      <Toaster position="top-center" />
      <div className="mx-auto mb-6 flex max-w-5xl items-center justify-between">
        <Button variant="outline" onClick={() => navigate(-1)} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <Button variant="ghost" onClick={() => navigate("/jobs")}>
          View All Jobs
        </Button>
      </div>

      <div className="mx-auto max-w-5xl">
        {errorMessage ? (
          <Card className="border border-red-200 bg-white shadow-lg">
            <CardContent className="p-8 text-center">
              <h1 className="text-2xl font-bold text-gray-900">Job details unavailable</h1>
              <p className="mt-3 text-gray-600">{errorMessage}</p>
              <Button className="mt-6" onClick={() => navigate("/jobs")}>Return to jobs</Button>
            </CardContent>
          </Card>
        ) : job ? (
          <Card className="overflow-hidden border border-blue-100 bg-white shadow-xl">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-8 text-white md:px-10">
              <p className="text-sm uppercase tracking-[0.3em] text-white/75">Job Opportunity</p>
              <h1 className="mt-2 text-3xl font-extrabold md:text-4xl">{job.title}</h1>
              <p className="mt-3 text-white/90">{job.company || "N/A"}</p>
            </div>

            <CardContent className="grid gap-6 p-6 md:p-10">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl bg-blue-50 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-blue-700">
                    <Briefcase className="h-4 w-4" />
                    Category
                  </div>
                  <p className="mt-2 text-gray-900">{job.category || "N/A"}</p>
                </div>

                <div className="rounded-2xl bg-purple-50 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-purple-700">
                    <MapPin className="h-4 w-4" />
                    District
                  </div>
                  <p className="mt-2 text-gray-900">{job.location || "N/A"}</p>
                </div>

                <div className="rounded-2xl bg-emerald-50 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
                    <GraduationCap className="h-4 w-4" />
                    Qualifications
                  </div>
                  <p className="mt-2 text-gray-900">
                    {job.qualification && job.qualification.length > 0
                      ? job.qualification.join(", ")
                      : "N/A"}
                  </p>
                </div>

                <div className="rounded-2xl bg-amber-50 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-amber-700">
                    <CalendarDays className="h-4 w-4" />
                    Schedule
                  </div>
                  <p className="mt-2 text-gray-900">
                    Opens: {job.openDate ? new Date(job.openDate).toLocaleDateString() : "N/A"}
                    <br />
                    Closes: {job.closeDate ? new Date(job.closeDate).toLocaleDateString() : "N/A"}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <h2 className="text-lg font-bold text-gray-900">Details</h2>
                <div className="mt-3 space-y-2 text-gray-700">
                  <p><span className="font-semibold">Type:</span> {job.positionType || "N/A"}</p>
                  <p><span className="font-semibold">Payment:</span> {job.paymentType || "N/A"}</p>
                </div>
              </div>

              <div className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-bold text-gray-900">Description</h2>
                <p className="mt-3 whitespace-pre-wrap leading-7 text-gray-700">
                  {job.description || "No description available."}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
};

export default JobDetails;
