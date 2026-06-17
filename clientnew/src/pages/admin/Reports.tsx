import React from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { 
  BarChart3, 
  Download, 
  Users as UsersIcon, 
  Building2, 
  Briefcase, 
  GraduationCap,
  TrendingUp,
  Activity
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

type Stats = {
  users: number;
  companies: number;
  jobs: number;
  courses: number;
};

const Reports: React.FC = () => {
  const token = localStorage.getItem("token");
  const config = { headers: { Authorization: `Bearer ${token}` } };
  const { data: users = [] } = useQuery({ queryKey: ["admin-users-list"], queryFn: async () => (await axios.get("http://localhost:5000/api/users", config)).data });
  const { data: companies = [] } = useQuery({ queryKey: ["admin-companies-list"], queryFn: async () => (await axios.get("http://localhost:5000/api/companies", config)).data });
  const { data: jobs = [] } = useQuery({ queryKey: ["admin-jobs-list"], queryFn: async () => (await axios.get("http://localhost:5000/api/jobs", config)).data });
  const { data: courses = [] } = useQuery({ queryKey: ["admin-courses-list"], queryFn: async () => (await axios.get("http://localhost:5000/api/courses", config)).data });

  const stats: Stats = {
    users: users.length,
    companies: companies.length,
    jobs: jobs.length,
    courses: courses.length,
  };

  const exportToCSV = (data: any[], fileName: string) => {
    if (data.length === 0) {
      toast.error("No data to export");
      return;
    }
    const headers = Object.keys(data[0]).join(",");
    const rows = data.map(item => 
      Object.values(item).map(val => `"${val}"`).join(",")
    );
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${fileName}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`${fileName} exported successfully!`);
  };

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <Toaster position="top-right" />
      <div className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-4xl font-extrabold text-blue-900 mb-2">System Analytics & Reports</h1>
          <p className="text-blue-600 font-medium">Global oversight of the Qualification Based Job Finder ecosystem.</p>
        </div>
        <button 
           onClick={() => toast.success("Reports are synced in real-time")}
           className="bg-white border text-blue-700 px-4 py-2 rounded-lg shadow-sm font-bold flex items-center gap-2 hover:bg-blue-50 transition"
        >
            <Activity className="w-4 h-4" /> Live System Status
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
        {[
          { label: "Total Users", value: stats.users, icon: UsersIcon, color: "bg-blue-600" },
          { label: "Partner Companies", value: stats.companies, icon: Building2, color: "bg-emerald-600" },
          { label: "Active Job Listings", value: stats.jobs, icon: Briefcase, color: "bg-indigo-600" },
          { label: "Available Courses", value: stats.courses, icon: GraduationCap, color: "bg-purple-600" },
        ].map((item, idx) => (
          <div key={idx} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden group">
            <div className={`absolute top-0 right-0 w-24 h-24 ${item.color} opacity-5 -mr-8 -mt-8 rounded-full group-hover:scale-110 transition-transform`} />
            <div className="flex items-center gap-4">
              <div className={`${item.color} p-4 rounded-xl text-white shadow-lg`}>
                <item.icon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">{item.label}</p>
                <p className="text-3xl font-black text-gray-900">{item.value}</p>
              </div>
            </div>
            <div className="mt-4 flex items-center text-xs font-bold text-emerald-600 gap-1 bg-emerald-50 w-fit px-2 py-1 rounded">
                <TrendingUp className="w-3 h-3" /> +12% from last month
            </div>
          </div>
        ))}
      </div>

      {/* Export Section */}
      <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-xl border-t-4 border-t-blue-600">
        <div className="flex items-center gap-3 mb-8">
            <BarChart3 className="w-8 h-8 text-blue-700" />
            <h2 className="text-2xl font-black text-gray-800 tracking-tight">Data Export Center</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <ExportCard 
            title="User Database" 
            count={stats.users} 
            description="Complete list of all registered job seekers including profiles and qualifications."
            onExport={() => exportToCSV(users, "System_Users_Report")} 
          />
          <ExportCard 
            title="Company Directory" 
            count={stats.companies} 
            description="Consolidated data of all verified and pending employer organizations."
            onExport={() => exportToCSV(companies, "Company_Partners_Report")} 
          />
          <ExportCard 
            title="Job Market Data" 
            count={stats.jobs} 
            description="Detailed analytics of job postings, categories, and hiring trends."
            onExport={() => exportToCSV(jobs, "Job_Postings_Report")} 
          />
          <ExportCard 
            title="Course Catalog" 
            count={stats.courses} 
            description="Full curriculum data and educational categories available in the portal."
            onExport={() => exportToCSV(courses, "Course_Catalog_Report")} 
          />
        </div>
      </div>
    </div>
  );
};

const ExportCard: React.FC<{ title: string; count: number; description: string; onExport: () => void }> = ({ title, count, description, onExport }) => (
    <div className="border border-gray-200 p-6 rounded-2xl bg-gray-50/50 hover:bg-white hover:shadow-lg transition-all flex flex-col justify-between">
        <div>
            <div className="flex justify-between items-start mb-4">
                <h3 className="font-black text-gray-900 text-lg">{title}</h3>
                <span className="bg-blue-100 text-blue-700 font-black text-xs px-2 py-1 rounded-full">{count} Items</span>
            </div>
            <p className="text-sm text-gray-500 leading-relaxed mb-6">{description}</p>
        </div>
        <button 
            onClick={onExport}
            className="w-full flex items-center justify-center gap-2 bg-blue-700 text-white font-bold py-3 rounded-xl hover:bg-blue-800 shadow-md hover:shadow-lg transition-all"
        >
            <Download className="w-5 h-5" /> Export to CSV
        </button>
    </div>
);

export default Reports;
