import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Search, Filter, MapPin, GraduationCap,
  Calendar, Bookmark, ExternalLink, X, ShieldCheck,
  LayoutGrid, List as ListIcon, FileText, ArrowRight
} from 'lucide-react';
import { opportunityService, applicationService } from '../services/scholarsetuService';
import { Opportunity } from '../types';
import { useAuth } from '../context/AuthContext';

export const ScholarshipsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();

  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedOpp, setSelectedOpp] = useState<Opportunity | null>(null);
  const [savedIds, setSavedIds] = useState<Set<number>>(new Set());

  // Filter parameters
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [state, setState] = useState(searchParams.get('state') || 'All');
  const [eduLevel, setEduLevel] = useState(searchParams.get('education_level') || 'ALL');
  const [category, setCategory] = useState(searchParams.get('category') || 'ALL');
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'default');

  const indianStates = [
    'All', 'All India', 'Karnataka', 'Maharashtra', 'Uttar Pradesh', 'Tamil Nadu',
    'West Bengal', 'Kerala', 'Delhi', 'Gujarat', 'Rajasthan', 'Bihar',
    'Andhra Pradesh', 'Telangana', 'Punjab', 'Madhya Pradesh', 'Odisha'
  ];

  const fetchOpportunities = async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = { opportunity_type: 'SCHOLARSHIP' };
      if (search) params.search = search;
      if (state !== 'All') params.state = state;
      if (eduLevel !== 'ALL') params.education_level = eduLevel;
      if (category !== 'ALL') params.category = category;
      if (sortBy !== 'default') params.sort = sortBy;

      const data = await opportunityService.getOpportunities(params);
      setOpportunities(data.results || []);
      setTotalCount(data.count || (data.results ? data.results.length : 0));
    } catch (err) {
      console.error('Failed to load opportunities', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOpportunities();
    if (user) {
      applicationService.getSaved().then((res) => {
        setSavedIds(new Set(res.map((item) => item.opportunity)));
      }).catch(() => {});
    }
  }, [state, eduLevel, category, sortBy]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchOpportunities();
  };

  const handleBookmarkToggle = async (opp: Opportunity) => {
    if (!user) {
      alert('Please sign in to save opportunities to your personal tracker.');
      return;
    }
    if (savedIds.has(opp.id)) {
      setSavedIds((prev) => {
        const next = new Set(prev);
        next.delete(opp.id);
        return next;
      });
    } else {
      try {
        await applicationService.saveOpportunity(opp.id);
        setSavedIds((prev) => new Set(prev).add(opp.id));
      } catch (err) {
        console.error(err);
      }
    }
  };

  const clearFilters = () => {
    setSearch('');
    setState('All');
    setEduLevel('ALL');
    setCategory('ALL');
    setSortBy('default');
    setSearchParams({});
  };

  const hasActiveFilters = search || state !== 'All' || eduLevel !== 'ALL' || category !== 'ALL';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-[#000000]">
      {/* Page Header */}
      <div className="mb-6 pb-4 border-b border-[#D2D2D4]">
        <h1 className="text-2xl font-bold tracking-tight text-[#000000]">
          Scholarships Directory
        </h1>
        <p className="text-xs text-[#000000]/60 mt-1">
          Explore genuine central, state, and institutional scholarships verified against official government circulars.
        </p>
      </div>

      {/* Search and Filter Panel */}
      <div className="bg-[#E7E7E7] rounded-xl border border-[#D2D2D4] p-4 mb-6">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative flex items-center">
            <Search className="w-4 h-4 text-[#000000]/40 absolute left-3.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by scholarship title, department, or eligible course..."
              className="w-full pl-10 pr-3 py-2 text-xs bg-[#FFFFFF] text-[#000000] border border-[#D2D2D4] rounded-lg focus:outline-none focus:border-[#FF634A]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={state}
              onChange={(e) => setState(e.target.value)}
              className="px-3 py-2 text-xs bg-[#FFFFFF] border border-[#D2D2D4] rounded-lg text-[#000000] font-medium focus:border-[#FF634A]"
            >
              {indianStates.map((st) => (
                <option key={st} value={st}>
                  {st === 'All' ? 'All Jurisdictions' : st}
                </option>
              ))}
            </select>

            <select
              value={eduLevel}
              onChange={(e) => setEduLevel(e.target.value)}
              className="px-3 py-2 text-xs bg-[#FFFFFF] border border-[#D2D2D4] rounded-lg text-[#000000] font-medium focus:border-[#FF634A]"
            >
              <option value="ALL">All Education Levels</option>
              <option value="UNDERGRADUATE">Undergraduate (UG)</option>
              <option value="POSTGRADUATE">Postgraduate (PG)</option>
              <option value="DIPLOMA">Diploma</option>
              <option value="CLASS_11_12">Class 11 - 12</option>
              <option value="CLASS_1_10">School (1-10)</option>
              <option value="PHD_RESEARCH">PhD / Research</option>
            </select>

            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="px-3 py-2 text-xs bg-[#FFFFFF] border border-[#D2D2D4] rounded-lg text-[#000000] font-medium focus:border-[#FF634A]"
            >
              <option value="ALL">All Categories</option>
              <option value="GENERAL">General</option>
              <option value="OBC">OBC</option>
              <option value="SC">SC</option>
              <option value="ST">ST</option>
              <option value="EWS">EWS</option>
            </select>

            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-[#FF634A] hover:bg-[#E5533D] text-[#FFFFFF] font-bold text-xs transition-colors"
            >
              Filter
            </button>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="px-3 py-2 rounded-lg text-xs font-semibold text-[#000000]/70 hover:text-[#000000] bg-[#FFFFFF] border border-[#D2D2D4] flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" /> Clear
              </button>
            )}
          </div>
        </form>

        <div className="flex items-center justify-between pt-3 mt-3 border-t border-[#D2D2D4] text-xs text-[#000000]/60">
          <p>
            Total Records: <strong className="text-[#000000]">{opportunities.length}</strong>
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md border ${
                viewMode === 'grid'
                  ? 'bg-[#FF634A] text-[#FFFFFF] border-[#FF634A]'
                  : 'bg-[#FFFFFF] text-[#000000] border-[#D2D2D4]'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md border ${
                viewMode === 'list'
                  ? 'bg-[#FF634A] text-[#FFFFFF] border-[#FF634A]'
                  : 'bg-[#FFFFFF] text-[#000000] border-[#D2D2D4]'
              }`}
              title="List View"
            >
              <ListIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Grid / List Results */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-48 rounded-xl bg-[#E7E7E7] animate-pulse" />
          ))}
        </div>
      ) : opportunities.length === 0 ? (
        <div className="text-center py-16 bg-[#E7E7E7] rounded-xl border border-[#D2D2D4] p-8">
          <GraduationCap className="w-10 h-10 text-[#000000]/30 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-[#000000]">No scholarships match the selected criteria</h3>
          <p className="text-xs text-[#000000]/60 max-w-sm mx-auto mt-1 mb-4">
            Try adjusting your search terms or clearing state and category filters.
          </p>
          <button
            onClick={clearFilters}
            className="px-4 py-2 rounded-lg bg-[#FF634A] text-[#FFFFFF] font-bold text-xs"
          >
            Clear Filters
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {opportunities.map((opp) => (
            <div
              key={opp.id}
              className="bg-[#E7E7E7] rounded-xl border border-[#D2D2D4] p-5 flex flex-col justify-between hover:border-[#000000] transition-colors"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#FFFFFF] text-[#000000] border border-[#D2D2D4]">
                    {opp.applicable_state || 'All India'}
                  </span>
                  <button
                    onClick={() => handleBookmarkToggle(opp)}
                    className={`p-1 rounded-md text-[#000000]/60 hover:text-[#FF634A] ${
                      savedIds.has(opp.id) ? 'text-[#FF634A]' : ''
                    }`}
                    title="Bookmark"
                  >
                    <Bookmark className="w-4 h-4 fill-current" />
                  </button>
                </div>

                <h3 className="font-bold text-[#000000] text-xs line-clamp-2 mb-1">
                  {opp.title}
                </h3>
                <p className="text-[11px] text-[#000000]/60 mb-3 truncate">{opp.provider}</p>

                <p className="text-xs text-[#000000]/70 line-clamp-3 mb-4 leading-relaxed">
                  {opp.short_description}
                </p>

                <div className="flex flex-wrap gap-1 mb-4 text-[10px]">
                  {opp.education_levels?.map((lvl) => (
                    <span key={lvl} className="px-1.5 py-0.5 rounded bg-[#FFFFFF] text-[#000000] border border-[#D2D2D4]">
                      {lvl.replace('_', ' ')}
                    </span>
                  ))}
                  {opp.max_annual_income && (
                    <span className="px-1.5 py-0.5 rounded bg-[#FFFFFF] text-[#000000] border border-[#D2D2D4]">
                      Income &lt; ₹{Number(opp.max_annual_income).toLocaleString('en-IN')}
                    </span>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-[#D2D2D4] flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase text-[#000000]/50 block">Benefit</span>
                  <span className="text-xs font-bold text-[#000000]">
                    {opp.benefit_amount ? `₹${Number(opp.benefit_amount).toLocaleString('en-IN')}` : opp.benefit_description || 'Grant'}
                  </span>
                </div>

                <button
                  onClick={() => setSelectedOpp(opp)}
                  className="px-3 py-1.5 rounded-lg bg-[#FF634A] hover:bg-[#E5533D] text-[#FFFFFF] text-xs font-bold transition-colors"
                >
                  View Details
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {opportunities.map((opp) => (
            <div
              key={opp.id}
              className="bg-[#E7E7E7] rounded-xl border border-[#D2D2D4] p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:border-[#000000] transition-colors"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#FFFFFF] text-[#000000] border border-[#D2D2D4]">
                    {opp.applicable_state || 'All India'}
                  </span>
                  <span className="text-xs text-[#000000]/60 truncate">{opp.provider}</span>
                </div>
                <h3 className="font-bold text-[#000000] text-xs mb-1">{opp.title}</h3>
                <p className="text-xs text-[#000000]/70 line-clamp-2">{opp.short_description}</p>
              </div>

              <div className="flex items-center gap-4 sm:flex-shrink-0">
                <div className="text-right">
                  <p className="text-xs font-bold text-[#000000]">
                    {opp.benefit_amount ? `₹${Number(opp.benefit_amount).toLocaleString('en-IN')}` : 'Grant'}
                  </p>
                  <p className="text-[10px] text-[#000000]/60">Deadline: {opp.application_closing_date || 'Open'}</p>
                </div>

                <button
                  onClick={() => setSelectedOpp(opp)}
                  className="px-3 py-1.5 rounded-lg bg-[#FF634A] hover:bg-[#E5533D] text-[#FFFFFF] text-xs font-bold"
                >
                  Details
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* DETAIL MODAL */}
      {selectedOpp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#000000]/60 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl bg-[#F4F4F6] rounded-xl border border-[#D2D2D4] overflow-hidden max-h-[90vh] flex flex-col shadow-2xl">
            <div className="p-5 border-b border-[#D2D2D4] flex items-start justify-between bg-[#E7E7E7]">
              <div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#000000] text-[#FFFFFF]">
                  {selectedOpp.government_level || 'GOVERNMENT'} SCHEME
                </span>
                <h2 className="text-sm font-bold text-[#000000] mt-1.5">{selectedOpp.title}</h2>
                <p className="text-xs text-[#000000]/60">{selectedOpp.provider}</p>
              </div>
              <button
                onClick={() => setSelectedOpp(null)}
                className="p-1 rounded-md text-[#000000]/60 hover:text-[#000000] hover:bg-[#D2D2D4]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs text-[#000000]">
              <div>
                <h4 className="font-bold text-[#000000] mb-1">Detailed Description</h4>
                <p className="leading-relaxed text-[#000000]/80">{selectedOpp.detailed_description || selectedOpp.short_description}</p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 rounded-lg bg-[#E7E7E7] border border-[#D2D2D4]">
                <div>
                  <p className="text-[10px] text-[#000000]/50 font-bold uppercase">Benefit</p>
                  <p className="font-bold text-[#000000] text-xs mt-0.5">
                    {selectedOpp.benefit_amount ? `₹${Number(selectedOpp.benefit_amount).toLocaleString('en-IN')}` : 'Full Waiver'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-[#000000]/50 font-bold uppercase">Deadline</p>
                  <p className="font-bold text-[#000000] text-xs mt-0.5">{selectedOpp.application_closing_date || 'Open'}</p>
                </div>
                <div>
                  <p className="text-[10px] text-[#000000]/50 font-bold uppercase">Verification</p>
                  <p className="font-bold text-[#FF634A] text-xs mt-0.5">Official Source</p>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-[#000000] mb-2">Eligibility Conditions</h4>
                <ul className="space-y-1 text-xs text-[#000000]/80 list-disc list-inside">
                  <li><strong>Jurisdiction:</strong> {selectedOpp.applicable_state || 'All India'}</li>
                  {selectedOpp.education_levels && (
                    <li><strong>Education Levels:</strong> {selectedOpp.education_levels.join(', ').replace(/_/g, ' ')}</li>
                  )}
                  {selectedOpp.max_annual_income && (
                    <li><strong>Income Limit:</strong> Below ₹{Number(selectedOpp.max_annual_income).toLocaleString('en-IN')}</li>
                  )}
                </ul>
              </div>

              {selectedOpp.required_documents && selectedOpp.required_documents.length > 0 && (
                <div>
                  <h4 className="font-bold text-[#000000] mb-2">Required Documents</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {selectedOpp.required_documents.map((doc, idx) => (
                      <div key={idx} className="p-2 rounded bg-[#E7E7E7] border border-[#D2D2D4] flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5 text-[#FF634A] flex-shrink-0" />
                        <span className="text-[11px] font-medium text-[#000000]">{doc}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-[#D2D2D4] bg-[#E7E7E7] flex items-center justify-between">
              <span className="text-[11px] text-[#000000]/60">Source: {selectedOpp.source_name || 'Government Gazette'}</span>
              <div className="flex gap-2">
                <button
                  onClick={() => handleBookmarkToggle(selectedOpp)}
                  className="px-3 py-1.5 rounded-lg border border-[#D2D2D4] bg-[#FFFFFF] text-xs font-bold text-[#000000] hover:bg-[#D2D2D4]"
                >
                  {savedIds.has(selectedOpp.id) ? 'Saved' : 'Save'}
                </button>
                <a
                  href={selectedOpp.official_application_url || 'https://scholarships.gov.in'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-1.5 rounded-lg bg-[#FF634A] hover:bg-[#E5533D] text-[#FFFFFF] font-bold text-xs flex items-center gap-1.5"
                >
                  Official Portal <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
