import React, { useState, useEffect } from 'react';
import { Calendar, Clock, ExternalLink } from 'lucide-react';
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
        <h1 className="text-2xl font-black text-black tracking-tight flex items-center gap-2">
          <Calendar className="w-6 h-6 text-[#FF634A]" />
          Scholarship Application Deadlines Calendar
        </h1>
        <p className="text-xs text-black/70 mt-1">
          Chronological timeline of verified closing dates for Indian state and central opportunities.
        </p>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-[#E7E7E7] rounded-xl border border-[#D2D2D4] animate-pulse" />
          ))}
        </div>
      ) : opportunities.length === 0 ? (
        <div className="bg-[#E7E7E7] rounded-xl border border-[#D2D2D4] p-8 text-center text-xs text-black/70">
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
                className={`p-4 rounded-xl border bg-[#E7E7E7] flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
                  isClosingSoon
                    ? 'border-[#FF634A]'
                    : isExpired
                    ? 'border-[#D2D2D4] opacity-60'
                    : 'border-[#D2D2D4]'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center font-black text-xs flex-shrink-0 ${
                      isClosingSoon
                        ? 'bg-[#FF634A] text-white'
                        : 'bg-[#F4F4F6] text-black border border-[#D2D2D4]'
                    }`}
                  >
                    <Clock className="w-5 h-5" />
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#F4F4F6] text-black border border-[#D2D2D4]">
                        {opp.applicable_state}
                      </span>
                      {daysLeft !== null && (
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            daysLeft <= 7 && daysLeft >= 0
                              ? 'bg-[#FF634A] text-white'
                              : daysLeft <= 15 && daysLeft >= 0
                              ? 'bg-[#F4F4F6] text-[#FF634A] border border-[#FF634A]'
                              : 'bg-[#F4F4F6] text-black border border-[#D2D2D4]'
                          }`}
                        >
                          {daysLeft < 0 ? 'Closed' : `${daysLeft} days remaining`}
                        </span>
                      )}
                    </div>

                    <h3 className="font-bold text-black text-sm line-clamp-1">{opp.title}</h3>
                    <p className="text-xs text-black/70">{opp.provider}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4 text-xs pt-2 sm:pt-0 border-t sm:border-t-0 border-[#D2D2D4]">
                  <div className="sm:text-right">
                    <p className="text-[10px] text-black/60 font-semibold uppercase">Closing Date</p>
                    <p className="font-bold text-black text-xs">{opp.application_closing_date || 'Open'}</p>
                  </div>

                  <a
                    href={opp.official_application_url || 'https://scholarships.gov.in'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-2 rounded-lg bg-[#FF634A] hover:opacity-90 text-white font-bold text-xs flex items-center gap-1.5 transition-opacity"
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
