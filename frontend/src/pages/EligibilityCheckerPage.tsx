import React, { useState } from 'react';
import {
  CheckCircle2, AlertTriangle, XCircle, HelpCircle,
  ShieldCheck, RefreshCw, FileText, ExternalLink, UserCheck,
  Download, Calendar, IndianRupee
} from 'lucide-react';
import { eligibilityService } from '../services/scholarsetuService';
import { offlineService } from '../services/offlineService';
import { useAuth } from '../context/AuthContext';

export const EligibilityCheckerPage: React.FC = () => {
  const { profile } = useAuth();

  const [formData, setFormData] = useState({
    state_or_ut: profile?.state_or_ut || 'Karnataka',
    education_level: profile?.current_education_level || 'UNDERGRADUATE',
    course_name: profile?.course_name || 'B.Tech / Engineering',
    annual_family_income: profile?.annual_family_income || 250000,
    income_certificate_available: profile?.income_certificate_available ?? true,
    academic_percentage: profile?.academic_percentage || 80.0,
    category: profile?.category || 'OBC',
    caste_certificate_available: profile?.caste_certificate_available ?? true,
    gender: profile?.gender || 'MALE',
    is_disabled: profile?.is_disabled ?? false,
    disability_percentage: profile?.disability_percentage || 40,
    is_minority: profile?.is_minority ?? false,
    age: profile?.age || 20,
  });

  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[] | null>(null);
  const [activeCategoryTab, setActiveCategoryTab] = useState<'ALL' | 'ELIGIBLE' | 'POTENTIALLY_ELIGIBLE' | 'INELIGIBLE'>('ALL');

  const indianStates = [
    'Karnataka', 'Maharashtra', 'Uttar Pradesh', 'Tamil Nadu', 'West Bengal',
    'Kerala', 'Delhi', 'Gujarat', 'Rajasthan', 'Bihar', 'Andhra Pradesh',
    'Telangana', 'Punjab', 'Madhya Pradesh', 'Odisha', 'Assam', 'Haryana'
  ];

  const handleEvaluate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await eligibilityService.evaluate({ custom_input: formData });
      setResults(res.results || []);
    } catch (err) {
      console.error('Failed to evaluate eligibility', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ELIGIBLE':
        return (
          <span className="px-2.5 py-1 rounded text-xs font-bold bg-[#FF634A] text-[#FFFFFF] flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" /> Eligible Scheme
          </span>
        );
      case 'POTENTIALLY_ELIGIBLE':
        return (
          <span className="px-2.5 py-1 rounded text-xs font-bold bg-[#E7E7E7] text-[#000000] border border-[#000000] flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-[#FF634A]" /> Potentially Eligible
          </span>
        );
      case 'INELIGIBLE':
        return (
          <span className="px-2.5 py-1 rounded text-xs font-bold bg-[#E7E7E7] text-[#000000]/60 border border-[#D2D2D4] flex items-center gap-1.5">
            <XCircle className="w-3.5 h-3.5" /> Not Currently Eligible
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded text-xs font-bold bg-[#E7E7E7] text-[#000000]/60 border border-[#D2D2D4] flex items-center gap-1.5">
            <HelpCircle className="w-3.5 h-3.5" /> Insufficient Info
          </span>
        );
    }
  };

  const handleDownloadChecklist = (item: any) => {
    const checklistItems = [
      item.explanation || 'Verify official guidelines',
      'Ensure income and domicile certificates are valid for the current academic session',
      'Confirm Aadhaar is mapped with bank account in the NPCI mapper for DBT credit',
      'Submit the final form on the official government portal before closing date'
    ];
    const requirements = item.matched_conditions?.length > 0 ? item.matched_conditions : ['Valid Government Certificates'];
    offlineService.downloadChecklistFile(item.opportunity_title, checklistItems, requirements);
  };

  // Filter results by active tab
  const filteredResults = results
    ? results.filter((r) => {
        if (activeCategoryTab === 'ALL') return true;
        return r.status === activeCategoryTab;
      })
    : [];

  const eligibleCount = results?.filter((r) => r.status === 'ELIGIBLE').length || 0;
  const potentialCount = results?.filter((r) => r.status === 'POTENTIALLY_ELIGIBLE').length || 0;
  const ineligibleCount = results?.filter((r) => r.status === 'INELIGIBLE').length || 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-[#000000]">
      {/* Title */}
      <div className="mb-6 pb-4 border-b border-[#D2D2D4]">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#E7E7E7] border border-[#D2D2D4] text-[10px] font-bold text-[#000000] mb-2 uppercase tracking-wider">
          <UserCheck className="w-3.5 h-3.5 text-[#FF634A]" />
          Deterministic Rules Engine
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-[#000000]">
          Deterministic Scheme Eligibility Checker
        </h1>
        <p className="text-xs text-[#000000]/60 mt-1">
          Verify your eligibility against official government criteria without AI hallucination. Results are categorized into Eligible, Potentially Eligible, and Not Currently Eligible.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Questionnaire Form */}
        <div className="lg:col-span-1 bg-[#E7E7E7] rounded-xl border border-[#D2D2D4] p-5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#000000] mb-4 pb-2 border-b border-[#D2D2D4] flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#FF634A]" />
            Your Eligibility Profile
          </h2>

          <form onSubmit={handleEvaluate} className="space-y-3">
            <div>
              <label className="block text-[11px] font-bold text-[#000000] mb-1">State / UT Domicile</label>
              <select
                value={formData.state_or_ut}
                onChange={(e) => setFormData({ ...formData, state_or_ut: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs bg-[#FFFFFF] border border-[#D2D2D4] rounded-md focus:border-[#FF634A] focus:outline-none"
              >
                {indianStates.map((st) => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#000000] mb-1">Current Education Level</label>
              <select
                value={formData.education_level}
                onChange={(e) => setFormData({ ...formData, education_level: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs bg-[#FFFFFF] border border-[#D2D2D4] rounded-md focus:border-[#FF634A] focus:outline-none"
              >
                <option value="CLASS_1_10">Class 1 - 10 (School)</option>
                <option value="CLASS_11_12">Class 11 - 12 (Higher Secondary)</option>
                <option value="DIPLOMA">Diploma</option>
                <option value="UNDERGRADUATE">Undergraduate (UG)</option>
                <option value="POSTGRADUATE">Postgraduate (PG)</option>
                <option value="PHD_RESEARCH">M.Phil / PhD / Research</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#000000] mb-1">Annual Family Income (₹)</label>
              <input
                type="number"
                value={formData.annual_family_income}
                onChange={(e) => setFormData({ ...formData, annual_family_income: Number(e.target.value) })}
                className="w-full px-2.5 py-1.5 text-xs bg-[#FFFFFF] border border-[#D2D2D4] rounded-md focus:border-[#FF634A] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#000000] mb-1">Academic Percentage / Marks (%)</label>
              <input
                type="number"
                step="0.1"
                value={formData.academic_percentage}
                onChange={(e) => setFormData({ ...formData, academic_percentage: Number(e.target.value) })}
                className="w-full px-2.5 py-1.5 text-xs bg-[#FFFFFF] border border-[#D2D2D4] rounded-md focus:border-[#FF634A] focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-bold text-[#000000] mb-1">Social Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs bg-[#FFFFFF] border border-[#D2D2D4] rounded-md focus:border-[#FF634A] focus:outline-none"
                >
                  <option value="GENERAL">General</option>
                  <option value="OBC">OBC</option>
                  <option value="SC">SC</option>
                  <option value="ST">ST</option>
                  <option value="EWS">EWS</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#000000] mb-1">Gender</label>
                <select
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs bg-[#FFFFFF] border border-[#D2D2D4] rounded-md focus:border-[#FF634A] focus:outline-none"
                >
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-md bg-[#FF634A] hover:bg-[#E5533D] text-[#FFFFFF] font-bold text-xs transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Evaluating Official Rules...
                  </>
                ) : (
                  'Run Deterministic Evaluation'
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Results Panel with 3 Category Tabs */}
        <div className="lg:col-span-2">
          {!results ? (
            <div className="bg-[#E7E7E7] rounded-xl border border-[#D2D2D4] p-12 text-center">
              <ShieldCheck className="w-10 h-10 text-[#000000]/30 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-[#000000]">Awaiting Evaluation</h3>
              <p className="text-xs text-[#000000]/60 max-w-sm mx-auto mt-1">
                Configure your academic details on the left and click "Run Deterministic Evaluation" to match against government rules.
              </p>
            </div>
          ) : results.length === 0 ? (
            <div className="bg-[#E7E7E7] rounded-xl border border-[#D2D2D4] p-10 text-center">
              <h3 className="text-sm font-bold text-[#000000]">No matching opportunities found</h3>
              <p className="text-xs text-[#000000]/60 mt-1">Try adjusting the income ceiling or education level parameters.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Three Mandatory Category Navigation Tabs */}
              <div className="flex flex-wrap items-center gap-1.5 pb-2 border-b border-[#D2D2D4]">
                <button
                  type="button"
                  onClick={() => setActiveCategoryTab('ALL')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    activeCategoryTab === 'ALL'
                      ? 'bg-[#000000] text-white'
                      : 'bg-[#E7E7E7] text-[#000000] border border-[#D2D2D4] hover:bg-[#D2D2D4]'
                  }`}
                >
                  All Schemes ({results.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveCategoryTab('ELIGIBLE')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    activeCategoryTab === 'ELIGIBLE'
                      ? 'bg-[#FF634A] text-white'
                      : 'bg-[#E7E7E7] text-[#000000] border border-[#D2D2D4] hover:bg-[#D2D2D4]'
                  }`}
                >
                  A. Eligible Schemes ({eligibleCount})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveCategoryTab('POTENTIALLY_ELIGIBLE')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    activeCategoryTab === 'POTENTIALLY_ELIGIBLE'
                      ? 'bg-[#FF634A] text-white'
                      : 'bg-[#E7E7E7] text-[#000000] border border-[#D2D2D4] hover:bg-[#D2D2D4]'
                  }`}
                >
                  B. Potentially Eligible ({potentialCount})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveCategoryTab('INELIGIBLE')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    activeCategoryTab === 'INELIGIBLE'
                      ? 'bg-[#000000] text-white'
                      : 'bg-[#E7E7E7] text-[#000000] border border-[#D2D2D4] hover:bg-[#D2D2D4]'
                  }`}
                >
                  C. Not Currently Eligible ({ineligibleCount})
                </button>
              </div>

              {filteredResults.length === 0 ? (
                <div className="bg-[#E7E7E7] rounded-xl border border-[#D2D2D4] p-8 text-center text-xs text-[#000000]/60">
                  No schemes in this specific category.
                </div>
              ) : (
                filteredResults.map((res: any, idx: number) => (
                  <div
                    key={idx}
                    className="bg-[#E7E7E7] rounded-xl border border-[#D2D2D4] p-5 space-y-3 hover:border-[#000000] transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <h4 className="text-xs font-bold text-[#000000]">{res.opportunity_title}</h4>
                        <p className="text-[11px] text-[#000000]/60">{res.provider}</p>
                      </div>
                      <div>{getStatusBadge(res.status)}</div>
                    </div>

                    {/* Deterministic Explanation & Reason */}
                    <div className="p-3 bg-[#FFFFFF] rounded-lg border border-[#D2D2D4] space-y-1">
                      <span className="text-[10px] font-bold uppercase text-[#000000]/50 block">Reason for Evaluation:</span>
                      <p className="text-xs text-[#000000]/80 leading-relaxed">
                        {res.explanation}
                      </p>
                    </div>

                    {/* Missing Information / Required Documents */}
                    {res.missing_profile_fields && res.missing_profile_fields.length > 0 && (
                      <div className="text-[11px] text-[#FF634A]">
                        <span className="font-bold block mb-1">Missing Information to Confirm Full Eligibility:</span>
                        <ul className="list-disc list-inside space-y-0.5">
                          {res.missing_profile_fields.map((m: string, mIdx: number) => (
                            <li key={mIdx}>Provide {m} in your profile or application</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Satisfied Criteria */}
                    {res.matched_conditions && res.matched_conditions.length > 0 && (
                      <div className="text-[11px] text-[#000000]/70">
                        <span className="font-bold text-[#000000] block mb-1">Satisfied Criteria:</span>
                        <ul className="list-disc list-inside space-y-0.5">
                          {res.matched_conditions.map((c: string, cIdx: number) => (
                            <li key={cIdx}>{c}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Unmet Conditions */}
                    {res.failed_conditions && res.failed_conditions.length > 0 && (
                      <div className="text-[11px] text-[#FF634A]">
                        <span className="font-bold block mb-1">Unmet Conditions:</span>
                        <ul className="list-disc list-inside space-y-0.5">
                          {res.failed_conditions.map((f: string, fIdx: number) => (
                            <li key={fIdx}>{f}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Footer Actions */}
                    <div className="pt-3 border-t border-[#D2D2D4] flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] text-[#000000]/50 font-bold uppercase">
                          Confidence: {res.confidence_score}%
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDownloadChecklist(res)}
                          className="text-[11px] font-bold text-[#000000] hover:text-[#FF634A] flex items-center gap-1 transition-colors"
                          title="Save application instructions for offline access"
                        >
                          <Download className="w-3.5 h-3.5 text-[#FF634A]" /> Download Checklist
                        </button>
                      </div>

                      {res.official_url && (
                        <a
                          href={res.official_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#FF634A] font-bold hover:underline flex items-center gap-1 text-[11px]"
                        >
                          Official Portal Link <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
