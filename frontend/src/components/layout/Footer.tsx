import React from 'react';
import { Link } from 'react-router-dom';
import { GraduationCap, ExternalLink, ShieldCheck, HeartHandshake, Phone, Mail } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-900 text-slate-300 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          {/* Brand info */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-9 h-9 rounded-lg bg-brand-600 flex items-center justify-center text-white">
                <GraduationCap className="w-5 h-5" />
              </div>
              <span className="font-extrabold text-lg text-white">
                Scholar<span className="text-brand-400">Setu</span> AI
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              India's comprehensive scholarship and citizen welfare discovery platform.
              Deterministic eligibility matching, verified government records, and intelligent assistance.
            </p>
            <div className="flex items-center gap-2 text-xs text-emerald-400 font-medium">
              <ShieldCheck className="w-4 h-4" />
              100% Traceable to Official Government Sources
            </div>
          </div>

          {/* Official Government Portals */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-3">
              Official Indian Portals
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <a
                  href="https://scholarships.gov.in"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-brand-400 transition-colors flex items-center gap-1.5"
                >
                  National Scholarship Portal (NSP) <ExternalLink className="w-3 h-3 text-slate-500" />
                </a>
              </li>
              <li>
                <a
                  href="https://www.myscheme.gov.in"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-brand-400 transition-colors flex items-center gap-1.5"
                >
                  myScheme Platform (MeitY) <ExternalLink className="w-3 h-3 text-slate-500" />
                </a>
              </li>
              <li>
                <a
                  href="https://socialjustice.gov.in/schemes"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-brand-400 transition-colors flex items-center gap-1.5"
                >
                  Ministry of Social Justice & Empowerment <ExternalLink className="w-3 h-3 text-slate-500" />
                </a>
              </li>
              <li>
                <a
                  href="https://www.ugc.gov.in"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-brand-400 transition-colors flex items-center gap-1.5"
                >
                  University Grants Commission (UGC) <ExternalLink className="w-3 h-3 text-slate-500" />
                </a>
              </li>
              <li>
                <a
                  href="https://www.aicte-india.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-brand-400 transition-colors flex items-center gap-1.5"
                >
                  AICTE Student Development Schemes <ExternalLink className="w-3 h-3 text-slate-500" />
                </a>
              </li>
            </ul>
          </div>

          {/* Quick Platform Links */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-3">
              Platform Features
            </h4>
            <ul className="space-y-2 text-xs">
              <li><Link to="/scholarships" className="hover:text-brand-400">All Scholarships</Link></li>
              <li><Link to="/schemes" className="hover:text-brand-400">Central & State Schemes</Link></li>
              <li><Link to="/eligibility" className="hover:text-brand-400">Deterministic Eligibility Checker</Link></li>
              <li><Link to="/ai-assistant" className="hover:text-brand-400">AI Scholarship Assistant (RAG)</Link></li>
              <li><Link to="/workflows" className="hover:text-brand-400">Visual Workflow Builder (React Flow)</Link></li>
              <li><Link to="/tracker" className="hover:text-brand-400">Application Status Tracker</Link></li>
              <li><Link to="/deadlines" className="hover:text-brand-400">Upcoming Deadlines Calendar</Link></li>
            </ul>
          </div>

          {/* Help & Contact */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-3">
              Helpline & Support
            </h4>
            <p className="text-xs text-slate-400 mb-2">
              For official scheme grievance, contact National Scholarship Portal Helpdesk:
            </p>
            <div className="flex items-center gap-2 text-xs font-semibold text-white mb-2">
              <Phone className="w-3.5 h-3.5 text-brand-400" />
              0120 - 6619540 (NSP Helpdesk)
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 mb-3">
              <Mail className="w-3.5 h-3.5 text-brand-400" />
              helpdesk@scholarsetu.gov.in
            </div>
            <Link
              to="/help"
              className="inline-block text-xs text-brand-400 hover:text-brand-300 font-semibold underline"
            >
              Browse Help Center & FAQs
            </Link>
          </div>
        </div>

        {/* Disclaimer Bar */}
        <div className="pt-6 border-t border-slate-800 text-[11px] text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>
            © {new Date().getFullYear()} ScholarSetu AI. Designed for Indian Students & Citizens.
            Not a government agency; all opportunity data is indexed with direct source traceability.
          </p>
          <div className="flex items-center space-x-4">
            <Link to="/help" className="hover:text-slate-200">Privacy Policy</Link>
            <Link to="/help" className="hover:text-slate-200">Terms of Use</Link>
            <Link to="/admin-hub" className="hover:text-slate-200">Admin Hub</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
