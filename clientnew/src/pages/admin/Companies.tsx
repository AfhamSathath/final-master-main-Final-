import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import {
  CheckCircle,
  XCircle,
  Building2,
  Mail,
  Phone,
  MapPin,
  Fingerprint,
  FileText,
  X,
  Activity,
  ExternalLink
} from "lucide-react";

type Company = {
  _id: string;
  name: string;
  email: string;
  contactNumber: string;
  location: string;
  regNumber: string;
  verificationStatus: "pending" | "verified" | "rejected" | "all";
  rejectionReason?: string;
  documents?: string[];
};

const API_BASE = "http://localhost:5000/api/companies";
const ADMIN_API = "http://localhost:5000/api/admins";

const Companies: React.FC = () => {
  const queryClient = useQueryClient();
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);

  const { data: companies = [], isLoading, isError } = useQuery<Company[]>({
    queryKey: ["admin-companies"],
    queryFn: async () => {
      const res = await axios.get(API_BASE);
      return res.data;
    },
  });

  const verifyMutation = useMutation({
    mutationFn: async (id: string) => {
      return axios.put(`${ADMIN_API}/companies/${id}/verify`);
    },
    onSuccess: () => {
      toast.success("Company verified successfully!");
      queryClient.invalidateQueries({ queryKey: ["admin-companies"] });
      setSelectedCompany(null);
    },
    onError: () => toast.error("Failed to verify company"),
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      return axios.put(`${ADMIN_API}/companies/${id}/reject`, { reason });
    },
    onSuccess: () => {
      toast.success("Company rejected.");
      queryClient.invalidateQueries({ queryKey: ["admin-companies"] });
      setSelectedCompany(null);
    },
    onError: () => toast.error("Failed to reject company"),
  });

  const handleVerify = (id: string) => {
    if (window.confirm("Are you sure you want to verify this company?")) {
      verifyMutation.mutate(id);
    }
  };

  const handleReject = (id: string) => {
    const reason = window.prompt("Enter rejection reason:", "Documents provided were insufficient or invalid.");
    if (reason !== null) {
      rejectMutation.mutate({ id, reason });
    }
  };

  const filteredCompanies = companies.filter(c =>
    filterStatus === "all" ? true : c.verificationStatus === filterStatus
  );

  if (isLoading) return <div className="p-10 text-center">Loading companies...</div>;
  if (isError) return <div className="p-10 text-center text-red-500">Error loading companies.</div>;

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <Toaster position="top-right" />
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Manage Company Registrations</h1>
        <div className="flex bg-white rounded-lg shadow-sm p-1 border">
          {["pending", "verified", "rejected", "all"].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${filterStatus === status
                ? "bg-blue-600 text-white shadow-md"
                : "text-gray-600 hover:bg-gray-100"
                }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCompanies.length === 0 && (
          <div className="col-span-full text-center py-20 bg-white rounded-xl border border-dashed text-gray-400">
            No companies found for this status.
          </div>
        )}
        {filteredCompanies.map((company) => (
          <div key={company._id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="bg-blue-50 p-3 rounded-lg">
                  <Building2 className="w-6 h-6 text-blue-600" />
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${company.verificationStatus === "verified" ? "bg-green-100 text-green-700" :
                  company.verificationStatus === "rejected" ? "bg-red-100 text-red-700" :
                    "bg-yellow-100 text-yellow-700"
                  }`}>
                  {company.verificationStatus}
                </div>
              </div>

              <h3 className="text-xl font-bold text-gray-900 mb-1">{company.name}</h3>
              <p className="text-gray-500 text-sm mb-4 flex items-center gap-1">
                <MapPin className="w-3 h-3" /> {company.location}
              </p>

              <div className="space-y-3 mb-6">
                <div className="flex items-center text-sm text-gray-600 gap-3">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <span>{company.email}</span>
                </div>
                <div className="flex items-center text-sm text-gray-600 gap-3">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <span>{company.contactNumber}</span>
                </div>
                <div className="flex items-center text-sm text-gray-600 gap-3">
                  <Fingerprint className="w-4 h-4 text-gray-400" />
                  <span className="font-mono bg-gray-50 px-2 py-0.5 rounded border text-xs">Reg: {company.regNumber}</span>
                </div>
              </div>

              {company.verificationStatus === "rejected" && company.rejectionReason && (
                <div className="mb-6 p-3 bg-red-50 rounded-lg border border-red-100">
                  <p className="text-xs font-bold text-red-800 mb-1 uppercase tracking-wider">Rejection Reason:</p>
                  <p className="text-sm text-red-600 italic">"{company.rejectionReason}"</p>
                </div>
              )}

              <button
                onClick={() => setSelectedCompany(company)}
                className="w-full flex items-center justify-center gap-2 bg-slate-100 text-slate-700 py-3 rounded-xl font-bold hover:bg-slate-200 transition shadow-sm border border-slate-200"
              >
                <FileText className="w-5 h-5" /> Review Documents
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Review Modal */}
      {selectedCompany && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b flex justify-between items-center bg-slate-50">
              <div className="flex items-center gap-4">
                <div className="bg-blue-600 p-3 rounded-2xl text-white">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-800">{selectedCompany.name}</h2>
                  <p className="text-slate-500 text-sm font-medium uppercase tracking-widest">{selectedCompany.regNumber}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedCompany(null)}
                className="bg-white border p-2 rounded-full hover:bg-red-50 hover:text-red-500 transition shadow-sm"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-8 lg:p-12">
              <div className="grid md:grid-cols-2 gap-12">
                {/* Details */}
                <div>
                  <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-blue-600" />
                    Business Information
                  </h3>
                  <div className="space-y-6">
                    <DetailRow label="Verification Status" value={selectedCompany.verificationStatus.toUpperCase()} color={
                      selectedCompany.verificationStatus === 'verified' ? 'text-green-600' :
                        selectedCompany.verificationStatus === 'rejected' ? 'text-red-600' : 'text-yellow-600'
                    } />
                    <DetailRow label="Corporate Email" value={selectedCompany.email} />
                    <DetailRow label="Direct Contact" value={selectedCompany.contactNumber} />
                    <DetailRow label="Primary Location" value={selectedCompany.location} />
                  </div>

                  {selectedCompany.verificationStatus === "pending" && (
                    <div className="mt-12 p-6 bg-blue-50 rounded-2xl border border-blue-100">
                      <h4 className="text-blue-800 font-bold mb-2">Verification Decision</h4>
                      <p className="text-blue-600 text-sm mb-6">By approving, you authorize this company to post jobs and interact with potential candidates.</p>
                      <div className="flex gap-4">
                        <button
                          onClick={() => handleVerify(selectedCompany._id)}
                          className="flex-1 bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 shadow-lg shadow-green-600/20 transition"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleReject(selectedCompany._id)}
                          className="flex-1 bg-white text-red-600 border border-red-200 py-3 rounded-xl font-bold hover:bg-red-50 transition"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Mock Documents Viewer */}
                <div className="bg-slate-50/50 p-6 rounded-3xl border border-slate-100 flex flex-col items-center gap-4 text-center">
                  <div className="w-20 h-20 bg-white rounded-2xl shadow-sm flex items-center justify-center border border-slate-50">
                    <FileText className="w-10 h-10 text-slate-300" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800">Company BR Document</h4>
                    <p className="text-xs text-slate-500 mt-1 max-w-[200px]">
                      {selectedCompany.documents?.[0]
                        ? "Registration certificate submitted for verification."
                        : "No registration certificate was uploaded during registration."}
                    </p>
                  </div>
                  {selectedCompany.documents?.[0] ? (
                    <div className="w-full space-y-3">
                      <a
                        href={`http://localhost:5000/uploads/${selectedCompany.documents[0]}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full flex items-center justify-between p-4 bg-white rounded-2xl border border-indigo-100 group hover:border-indigo-300 transition-all shadow-sm hover:shadow-md"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-indigo-50 rounded-xl group-hover:bg-indigo-100 transition-colors">
                            {selectedCompany.documents[0].toLowerCase().endsWith('.pdf') ? (
                              <FileText className="w-5 h-5 text-red-500" />
                            ) : (
                              <Activity className="w-5 h-5 text-indigo-600" />
                            )}
                          </div>
                          <div className="text-left">
                            <span className="text-sm font-black text-slate-800 block leading-none">BR Certificate</span>
                            <span className="text-[10px] text-slate-400 font-bold uppercase mt-1 block">
                              {selectedCompany.documents[0].toLowerCase().endsWith('.pdf') ? 'Digital PDF File' : 'Image Document'}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">PREVIEW</span>
                          <ExternalLink className="w-4 h-4 text-indigo-400 group-hover:text-indigo-600 transition-colors" />
                        </div>
                      </a>
                      <p className="text-[10px] text-slate-400 italic text-center">Click to open the registration certificate in a secure viewer tab.</p>
                    </div>
                  ) : (
                    <div className="w-full p-4 bg-slate-100/50 rounded-2xl border border-dashed border-slate-200 text-[10px] font-bold text-slate-400">
                      DOCUMENT NOT AVAILABLE
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const DetailRow: React.FC<{ label: string; value: string; color?: string }> = ({ label, value, color }) => (
  <div className="border-b border-slate-100 pb-3">
    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{label}</p>
    <p className={`font-bold ${color || 'text-slate-700'}`}>{value}</p>
  </div>
);

export default Companies;
