import React from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, Award, BookOpen, Briefcase } from 'lucide-react';

export const QualificationFilter: React.FC = () => {
  const navigate = useNavigate();

  // Pick some representative ones for the landing page
  const featuredQuals = [
    { name: "G.C.E. A/L", icon: <GraduationCap className="w-8 h-8 text-indigo-500" /> },
    { name: "Diploma", icon: <Award className="w-8 h-8 text-emerald-500" /> },
    { name: "Bachelor's Degree", icon: <GraduationCap className="w-8 h-8 text-amber-500" /> },
    { name: "Master's Degree", icon: <Award className="w-8 h-8 text-rose-500" /> },
    { name: "Professional Qualification", icon: <Briefcase className="w-8 h-8 text-cyan-500" /> },
  ];

  return (
    <section className="py-16 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            Find Opportunities by Your
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent ml-2">Qualification</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Select your current level of education to discover tailored courses and job openings.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 max-w-6xl mx-auto">
          {featuredQuals.map((qual) => (
            <button
              key={qual.name}
              onClick={() => navigate(`/jobs?qualification=${encodeURIComponent(qual.name)}`)}
              className="flex flex-col items-center justify-center p-6 bg-white rounded-2xl border-2 border-transparent hover:border-blue-500 hover:shadow-xl transition-all duration-300 group shadow-sm hover:-translate-y-1"
            >
              <div className="mb-4 transform group-hover:scale-110 transition-transform">
                {qual.icon}
              </div>
              <span className="text-center font-semibold text-gray-800 text-sm group-hover:text-blue-600">
                {qual.name}
              </span>
            </button>
          ))}
        </div>


      </div>
    </section>
  );
};