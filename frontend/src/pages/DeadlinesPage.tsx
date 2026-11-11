import React, { useState, useEffect } from 'react';
import { Calendar, Clock, AlertTriangle, ExternalLink, ShieldCheck, MapPin } from 'lucide-react';
import { opportunityService } from '../services/scholarsetuService';
import { Opportunity } from '../types';

export const DeadlinesPage: React.FC = () => {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOpps = async () => {
      setLoading(true);
      try {
        const res = await opportunityService.getOpportunities({ sort: 'deadline' });
        setOpportunities(res.results || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchOpps();
  }, []);

  const getDaysRemaining = (closingDate?: string) => {
    if (!closingDate) return null;
    const today = new Date();
    const end = new Date(closingDate);
    const diff = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
          <Calendar className="w-6 h-6 text-brand-600" />
          Scholarship Application Deadlines Calendar
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Chronological timeline of verified closing dates for Indian state and central opportunities.
        </p>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-white rounded-2xl border border-slate-200 animate-pulse" />
          ))}
        </div>
      ) : opportunities.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-xs text-slate-500">
          No scheduled deadlines available.
        </div>
      ) : (
        <div className="space-y-3">
          {opportunities.map((opp) => {
            const daysLeft = getDaysRemaining(opp.application_closing_date);
            const isClosingSoon = daysLeft !== null && daysLeft <= 15 && daysLeft >= 0;
            const isExpired = daysLeft !== null && daysLeft < 0;

            return (
              <div
                key={opp.id}
                className={`p-4 rounded-2xl border bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
                  isClosingSoon
                    ? 'border-amber-300 shadow-sm shadow-amber-500/5'
                    : isExpired
                    ? 'border-slate-200 opacity-60'
                    : 'border-slate-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs flex-shrink-0 ${
                    isClosingSoon
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-brand-50 text-brand-700'
                  }`}>
                    <Clock className="w-5 h-5" />
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                        {opp.applicable_state}
                      </span>
                      {daysLeft !== null && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          daysLeft <= 7 && daysLeft >= 0
                            ? 'bg-rose-100 text-rose-800'
                            : daysLeft <= 15 && daysLeft >= 0
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {daysLeft < 0 ? 'Closed' : `${daysLeft} days remaining`}
                        </span>
                      )}
                    </div>

                    <h3 className="font-bold text-slate-900 text-sm line-clamp-1">{opp.title}</h3>
                    <p className="text-xs text-slate-500">{opp.provider}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4 text-xs pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                  <div className="sm:text-right">
                    <p className="text-[10px] text-slate-400 font-semibold uppercase">Closing Date</p>
                    <p className="font-bold text-slate-800 text-xs">{opp.application_closing_date || 'Open'}</p>
                  </div>

                  <a
                    href={opp.official_application_url || 'https://scholarships.gov.in'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm"
                  >
                    Apply Now <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
