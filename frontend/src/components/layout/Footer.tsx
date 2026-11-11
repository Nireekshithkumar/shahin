import React from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, ShieldCheck } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-[#E7E7E7] text-[#000000] border-t border-[#D2D2D4] mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand info */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-8 h-8 rounded-md bg-[#000000] text-[#FFFFFF] flex items-center justify-center font-bold text-xs border border-[#D2D2D4] relative">
                <span>SS</span>
                <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-[#FF634A]" />
              </div>
              <span className="font-bold text-sm tracking-tight text-[#000000]">
                ScholarSetu
              </span>
            </div>
            <p className="text-xs text-[#000000]/70 leading-relaxed mb-4">
              Indian Government Scheme and Scholarship Discovery Platform. Grounded in verified ministry circulars and official state portals.
            </p>
            <div className="flex items-center gap-1.5 text-xs text-[#000000] font-semibold">
              <ShieldCheck className="w-4 h-4 text-[#FF634A]" />
              100% Traceable to Official Gazette Records
            </div>
          </div>

          {/* Official Portals */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#000000] mb-3">
              Official Indian Portals
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <a
                  href="https://scholarships.gov.in"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[#FF634A] transition-colors flex items-center gap-1.5 text-[#000000]/80"
                >
                  National Scholarship Portal (NSP) <ExternalLink className="w-3 h-3 opacity-60" />
                </a>
              </li>
              <li>
                <a
                  href="https://www.myscheme.gov.in"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[#FF634A] transition-colors flex items-center gap-1.5 text-[#000000]/80"
                >
                  myScheme Platform (MeitY) <ExternalLink className="w-3 h-3 opacity-60" />
                </a>
              </li>
              <li>
                <a
                  href="https://socialjustice.gov.in/schemes"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[#FF634A] transition-colors flex items-center gap-1.5 text-[#000000]/80"
                >
                  Ministry of Social Justice & Empowerment <ExternalLink className="w-3 h-3 opacity-60" />
                </a>
              </li>
              <li>
                <a
                  href="https://www.aicte-india.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[#FF634A] transition-colors flex items-center gap-1.5 text-[#000000]/80"
                >
                  AICTE Student Schemes <ExternalLink className="w-3 h-3 opacity-60" />
                </a>
              </li>
            </ul>
          </div>

          {/* Platform Features */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#000000] mb-3">
              Platform Modules
            </h4>
            <ul className="space-y-2 text-xs text-[#000000]/80">
              <li><Link to="/scholarships" className="hover:text-[#FF634A]">Scholarships Directory</Link></li>
              <li><Link to="/schemes" className="hover:text-[#FF634A]">Government Schemes</Link></li>
              <li><Link to="/eligibility" className="hover:text-[#FF634A]">Eligibility Checker</Link></li>
              <li><Link to="/document-readiness" className="hover:text-[#FF634A]">Document Readiness Checker</Link></li>
              <li><Link to="/benefit-calculator" className="hover:text-[#FF634A]">Benefit Calculator</Link></li>
              <li><Link to="/tracker" className="hover:text-[#FF634A]">Application Status Tracker</Link></li>
            </ul>
          </div>

          {/* AI Services */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#000000] mb-3">
              Intelligent Assistance
            </h4>
            <ul className="space-y-2 text-xs text-[#000000]/80">
              <li><Link to="/ai-assistant" className="hover:text-[#FF634A]">Multilingual Voice Assistant</Link></li>
              <li><Link to="/rejection-analyzer" className="hover:text-[#FF634A]">AI Rejection Reason Analyzer</Link></li>
              <li><Link to="/family-discovery" className="hover:text-[#FF634A]">Family Scheme Discovery</Link></li>
              <li><Link to="/deadlines" className="hover:text-[#FF634A]">Deadline Alerts</Link></li>
              <li><Link to="/help" className="hover:text-[#FF634A]">User Guidelines</Link></li>
            </ul>
          </div>
        </div>

        <div className="pt-6 border-t border-[#D2D2D4] flex flex-col sm:flex-row items-center justify-between text-xs text-[#000000]/60 gap-3">
          <p>
            ScholarSetu AI. National Scholarship & Citizen Welfare Discovery System.
          </p>
          <div className="flex items-center gap-4">
            <span className="font-semibold text-[#000000]">Strict Four-Color Opaline Design System</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
