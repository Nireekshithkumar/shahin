import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Search, Filter, SlidersHorizontal, MapPin, GraduationCap,
  Calendar, CheckCircle2, Bookmark, ExternalLink, X, ShieldCheck,
  ChevronDown, LayoutGrid, List as ListIcon, AlertCircle, FileText
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

  // Filters state
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [state, setState] = useState(searchParams.get('state') || 'All');
  const [eduLevel, setEduLevel] = useState(searchParams.get('education_level') || 'ALL');
  const [category, setCategory] = useState(searchParams.get('category') || 'ALL');
  const [gender, setGender] = useState(searchParams.get('gender') || 'ALL');
  const [govLevel, setGovLevel] = useState(searchParams.get('gov_level') || 'ALL');
  const [disability, setDisability] = useState(searchParams.get('disability') === 'true');
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'default');

  const indianStates = [
    'All', 'All India', 'Karnataka', 'Maharashtra', 'Uttar Pradesh', 'Tamil Nadu',
    'West Bengal', 'Kerala', 'Delhi', 'Gujarat', 'Rajasthan', 'Bihar',
    'Andhra Pradesh', 'Telangana', 'Punjab', 'Madhya Pradesh', 'Odisha'
  ];

  const fetchOpportunities = async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = {};
      if (search) params.search = search;
      if (state !== 'All') params.state = state;
      if (eduLevel !== 'ALL') params.education_level = eduLevel;
      if (category !== 'ALL') params.category = category;
      if (gender !== 'ALL') params.gender = gender;
      if (govLevel !== 'ALL') params.gov_level = govLevel;
      if (disability) params.disability = 'true';
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
  }, [state, eduLevel, category, gender, govLevel, disability, sortBy]);

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
    setGender('ALL');
    setGovLevel('ALL');
    setDisability(false);
    setSortBy('default');
    setSearchParams({});
  };

  const hasActiveFilters = search || state !== 'All' || eduLevel !== 'ALL' || category !== 'ALL' || gender !== 'ALL' || govLevel !== 'ALL' || disability;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
          Indian Scholarships & Financial Assistance Directory
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Explore genuine central, state, and foundation scholarships verified from official government portals.
        </p>
      </div>

      {/* Search and Filter Control Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm mb-6">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative flex items-center">
            <Search className="w-4 h-4 text-slate-400 absolute left-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by scholarship name, eligibility criteria, department, or course..."
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* State filter */}
            <select
              value={state}
              onChange={(e) => setState(e.target.value)}
              className="px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 text-slate-700 font-medium focus:outline-none"
            >
              {indianStates.map((st) => (
                <option key={st} value={st}>
                  {st === 'All' ? 'All States' : st}
                </option>
              ))}
            </select>

            {/* Education level */}
            <select
              value={eduLevel}
              onChange={(e) => setEduLevel(e.target.value)}
              className="px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 text-slate-700 font-medium focus:outline-none"
            >
              <option value="ALL">All Degrees</option>
              <option value="UNDERGRADUATE">Undergraduate (UG)</option>
              <option value="POSTGRADUATE">Postgraduate (PG)</option>
              <option value="DIPLOMA">Diploma</option>
              <option value="CLASS_11_12">Class 11 - 12</option>
              <option value="CLASS_1_10">School (1-10)</option>
              <option value="PHD_RESEARCH">PhD / Research</option>
            </select>

            {/* Category */}
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 text-slate-700 font-medium focus:outline-none"
            >
              <option value="ALL">All Categories</option>
              <option value="GENERAL">General</option>
              <option value="OBC">OBC</option>
              <option value="SC">SC</option>
              <option value="ST">ST</option>
              <option value="EWS">EWS</option>
            </select>

            {/* Sort by */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 text-slate-700 font-medium focus:outline-none"
            >
              <option value="default">Sort: Default</option>
              <option value="deadline">Closing Soonest</option>
              <option value="benefit">Highest Benefit</option>
              <option value="recent">Recently Added</option>
            </select>

            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-sm transition-all"
            >
              Search
            </button>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="px-3 py-2 rounded-xl text-xs text-red-600 font-semibold hover:bg-red-50 flex items-center gap-1 transition-colors"
              >
                <X className="w-3.5 h-3.5" /> Clear
              </button>
            )}
          </div>
        </form>

        {/* View Mode Toggle and Result Count */}
        <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100 text-xs text-slate-500">
          <p>
            Showing <strong className="text-slate-800">{opportunities.length}</strong> opportunities
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg ${viewMode === 'grid' ? 'bg-brand-50 text-brand-600' : 'text-slate-400 hover:text-slate-600'}`}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg ${viewMode === 'list' ? 'bg-brand-50 text-brand-600' : 'text-slate-400 hover:text-slate-600'}`}
              title="List View"
            >
              <ListIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Opportunities List / Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-64 rounded-2xl bg-white border border-slate-200 animate-pulse" />
          ))}
        </div>
      ) : opportunities.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 p-8">
          <GraduationCap className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No matching scholarships found</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-4">
            Try adjusting your search filters or clearing the category and education level constraints.
          </p>
          <button
            onClick={clearFilters}
            className="px-4 py-2 rounded-xl bg-brand-600 text-white font-bold text-xs"
          >
            Clear All Filters
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {opportunities.map((opp) => (
            <div
              key={opp.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-brand-50 text-brand-700 border border-brand-200">
                    {opp.applicable_state}
                  </span>
                  <button
                    onClick={() => handleBookmarkToggle(opp)}
                    className={`p-1.5 rounded-md text-slate-400 hover:text-brand-600 transition-colors ${
                      savedIds.has(opp.id) ? 'text-brand-600 bg-brand-50' : ''
                    }`}
                    title="Bookmark"
                  >
                    <Bookmark className="w-4 h-4 fill-current" />
                  </button>
                </div>

                <h3 className="font-bold text-slate-900 text-sm mb-1 line-clamp-2">
                  {opp.title}
                </h3>
                <p className="text-xs text-slate-500 font-medium mb-3">{opp.provider}</p>

                <p className="text-xs text-slate-600 line-clamp-3 mb-4 leading-relaxed">
                  {opp.short_description}
                </p>

                <div className="flex flex-wrap gap-1.5 mb-4 text-[10px]">
                  {opp.education_levels?.map((lvl) => (
                    <span key={lvl} className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold">
                      {lvl.replace('_', ' ')}
                    </span>
                  ))}
                  {opp.max_annual_income && (
                    <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 font-semibold border border-amber-200">
                      Income &lt; ₹{Number(opp.max_annual_income).toLocaleString('en-IN')}
                    </span>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-slate-400 font-medium">Financial Benefit</p>
                  <p className="text-xs font-black text-emerald-600">
                    {opp.benefit_amount ? `₹${Number(opp.benefit_amount).toLocaleString('en-IN')}` : 'Direct Grant'}
                  </p>
                </div>

                <button
                  onClick={() => setSelectedOpp(opp)}
                  className="px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold transition-all shadow-sm"
                >
                  View Details
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {opportunities.map((opp) => (
            <div
              key={opp.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-brand-50 text-brand-700">
                    {opp.applicable_state}
                  </span>
                  <span className="text-xs text-slate-400">•</span>
                  <span className="text-xs text-slate-500 font-medium">{opp.provider}</span>
                </div>
                <h3 className="font-bold text-slate-900 text-sm mb-1">{opp.title}</h3>
                <p className="text-xs text-slate-600 line-clamp-2 max-w-3xl">{opp.short_description}</p>
              </div>

              <div className="flex items-center gap-4 sm:flex-shrink-0">
                <div className="text-right">
                  <p className="text-xs font-black text-emerald-600">
                    {opp.benefit_amount ? `₹${Number(opp.benefit_amount).toLocaleString('en-IN')}` : 'Full Waiver'}
                  </p>
                  <p className="text-[10px] text-slate-400">Deadline: {opp.application_closing_date || 'Open'}</p>
                </div>

                <button
                  onClick={() => setSelectedOpp(opp)}
                  className="px-3.5 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-sm"
                >
                  View Details
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* DETAIL DRAWER / MODAL */}
      {selectedOpp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex items-start justify-between bg-slate-50">
              <div>
                <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-brand-100 text-brand-800">
                  {selectedOpp.government_level} Government Scheme
                </span>
                <h2 className="text-base font-bold text-slate-900 mt-1">{selectedOpp.title}</h2>
                <p className="text-xs text-slate-500 font-medium">{selectedOpp.provider}</p>
              </div>
              <button
                onClick={() => setSelectedOpp(null)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-700">
              <div>
                <h4 className="font-bold text-slate-900 mb-1">Detailed Description</h4>
                <p className="leading-relaxed text-slate-600">{selectedOpp.detailed_description || selectedOpp.short_description}</p>
              </div>

              {/* Benefit & Key Info */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-brand-50/50 border border-brand-100">
                <div>
                  <p className="text-[10px] text-slate-400 font-semibold uppercase">Financial Assistance</p>
                  <p className="font-black text-emerald-700 text-sm mt-0.5">
                    {selectedOpp.benefit_amount ? `₹${Number(selectedOpp.benefit_amount).toLocaleString('en-IN')}` : 'Direct Grant'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-semibold uppercase">Application Deadline</p>
                  <p className="font-bold text-slate-800 text-xs mt-0.5">{selectedOpp.application_closing_date || 'Open'}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-semibold uppercase">Source Reliability</p>
                  <p className="font-bold text-emerald-700 text-xs mt-0.5 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> High (Official)
                  </p>
                </div>
              </div>

              {/* Eligibility Rules */}
              <div>
                <h4 className="font-bold text-slate-900 mb-2">Eligibility Rules</h4>
                <ul className="space-y-1.5 text-xs text-slate-600 list-disc list-inside">
                  <li><strong>Applicable State:</strong> {selectedOpp.applicable_state}</li>
                  {selectedOpp.education_levels && (
                    <li><strong>Degree Level:</strong> {selectedOpp.education_levels.join(', ').replace(/_/g, ' ')}</li>
                  )}
                  {selectedOpp.max_annual_income && (
                    <li><strong>Annual Family Income Cap:</strong> Below ₹{Number(selectedOpp.max_annual_income).toLocaleString('en-IN')}</li>
                  )}
                  {selectedOpp.min_academic_percentage && (
                    <li><strong>Academic Score Cutoff:</strong> Minimum {selectedOpp.min_academic_percentage}% in qualifying exam</li>
                  )}
                  {selectedOpp.eligible_categories && (
                    <li><strong>Eligible Categories:</strong> {selectedOpp.eligible_categories.join(', ')}</li>
                  )}
                </ul>
              </div>

              {/* Required Documents */}
              {selectedOpp.required_documents && selectedOpp.required_documents.length > 0 && (
                <div>
                  <h4 className="font-bold text-slate-900 mb-2">Required Documents</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {selectedOpp.required_documents.map((doc, idx) => (
                      <div key={idx} className="p-2 rounded-lg bg-slate-50 border border-slate-200 flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5 text-brand-600 flex-shrink-0" />
                        <span className="text-[11px] font-medium text-slate-700">{doc}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer with Official Application link */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <span className="text-[11px] text-slate-500">Source: {selectedOpp.source_name}</span>
              <div className="flex gap-2">
                <button
                  onClick={() => handleBookmarkToggle(selectedOpp)}
                  className="px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 flex items-center gap-1.5"
                >
                  <Bookmark className="w-3.5 h-3.5" />
                  {savedIds.has(selectedOpp.id) ? 'Saved' : 'Save'}
                </button>
                <a
                  href={selectedOpp.official_application_url || selectedOpp.official_information_url || 'https://scholarships.gov.in'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-xl bg-saffron-600 hover:bg-saffron-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm"
                >
                  Apply on Official Portal <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
