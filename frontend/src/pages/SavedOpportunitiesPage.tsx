import React, { useState, useEffect } from 'react';
import { Bookmark, Trash2, ExternalLink, Calendar, ShieldCheck, History, Eye } from 'lucide-react';
import { applicationService, opportunityService } from '../services/scholarsetuService';
import { SavedOpportunityItem } from '../types';
import { useAuth } from '../context/AuthContext';

export const SavedOpportunitiesPage: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'saved' | 'viewed'>('saved');
  const [saved, setSaved] = useState<SavedOpportunityItem[]>([]);
  const [viewed, setViewed] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSaved = async () => {
    setLoading(true);
    try {
      if (user) {
        const [savedData, viewedData] = await Promise.all([
          applicationService.getSaved(),
          opportunityService.getViewed()
        ]);
        setSaved(savedData);
        setViewed(viewedData);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSaved();
  }, [user]);

  const handleRemove = async (id: number) => {
    try {
      await applicationService.removeSaved(id);
      fetchSaved();
    } catch (err) {
      console.error(err);
    }
  };


  if (!user) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <Bookmark className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-slate-800">Sign in to view saved opportunities</h2>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
          Bookmark scholarships and schemes to keep them organized for quick access.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Bookmark className="w-6 h-6 text-brand-600" />
            My Opportunities & History
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Access your bookmarked scholarships and monitor your recent opportunity view history.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl self-start">
          <button
            onClick={() => setActiveTab('saved')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'saved'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Bookmark className="w-3.5 h-3.5 text-brand-600" />
            Saved ({saved.length})
          </button>
          <button
            onClick={() => setActiveTab('viewed')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'viewed'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <History className="w-3.5 h-3.5 text-blue-600" />
            View History ({viewed.length})
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 rounded-2xl bg-white border border-slate-200 animate-pulse" />
          ))}
        </div>
      ) : activeTab === 'saved' ? (
        saved.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <Bookmark className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h3 className="font-bold text-slate-800 text-sm">No saved opportunities</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
              Click the bookmark icon on any scholarship card to save it here.
            </p>
            <a
              href="/scholarships"
              className="px-4 py-2 rounded-xl bg-brand-600 text-white font-bold text-xs"
            >
              Explore Scholarships
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {saved.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between hover:border-slate-300 transition-all"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-brand-50 text-brand-700">
                      {item.opportunity_details?.applicable_state || 'All India'}
                    </span>
                    <button
                      onClick={() => handleRemove(item.id)}
                      className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50"
                      title="Remove from saved"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <h3 className="font-bold text-slate-900 text-sm mb-1 line-clamp-2">
                    {item.opportunity_details?.title}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium mb-3">
                    {item.opportunity_details?.provider}
                  </p>

                  <p className="text-xs text-slate-600 line-clamp-2 mb-4 leading-relaxed">
                    {item.opportunity_details?.short_description}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {item.opportunity_details?.application_closing_date || 'Open'}
                  </span>

                  <a
                    href={item.opportunity_details?.official_application_url || 'https://scholarships.gov.in'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold text-brand-600 hover:underline flex items-center gap-1"
                  >
                    Apply <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        /* Viewed Tab */
        viewed.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <History className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h3 className="font-bold text-slate-800 text-sm">No browsing history yet</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
              Opportunities you view in detail will be tracked here so you can revisit them anytime.
            </p>
            <a
              href="/scholarships"
              className="px-4 py-2 rounded-xl bg-brand-600 text-white font-bold text-xs"
            >
              Discover Scholarships
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {viewed.map((v) => {
              const opp = v.opportunity || {};
              return (
                <div
                  key={v.id}
                  className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between hover:border-slate-300 transition-all"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700">
                        {opp.applicable_state || 'All India'}
                      </span>
                      <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                        <Eye className="w-3 h-3" />
                        {v.view_count || 1}x viewed
                      </span>
                    </div>

                    <h3 className="font-bold text-slate-900 text-sm mb-1 line-clamp-2">
                      {opp.title}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium mb-3">
                      {opp.provider}
                    </p>

                    <p className="text-xs text-slate-600 line-clamp-2 mb-4 leading-relaxed">
                      {opp.short_description}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>Last viewed: {v.last_viewed_at ? new Date(v.last_viewed_at).toLocaleDateString() : 'Recently'}</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Deadline: {opp.application_closing_date || 'Open'}
                      </span>
                    </div>

                    <div className="flex items-center justify-end">
                      <a
                        href={opp.official_application_url || 'https://scholarships.gov.in'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-bold text-brand-600 hover:underline flex items-center gap-1 text-xs"
                      >
                        Official Portal <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}
    </div>
  );
};

