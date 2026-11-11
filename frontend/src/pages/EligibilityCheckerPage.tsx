import React, { useState } from 'react';
import {
  CheckCircle2, AlertTriangle, XCircle, HelpCircle, ArrowRight,
  ShieldCheck, Sparkles, RefreshCw, FileText, ExternalLink, UserCheck
} from 'lucide-react';
import { eligibilityService } from '../services/scholarsetuService';
import { useAuth } from '../context/AuthContext';

export const EligibilityCheckerPage: React.FC = () => {
  const { profile, user } = useAuth();

  const [formData, setFormData] = useState({
    state_or_ut: profile?.state_or_ut || 'Karnataka',
    education_level: profile?.current_education_level || 'UNDERGRADUATE',
    course_name: profile?.course_name || 'B.Tech / Bachelor of Engineering',
    annual_family_income: profile?.annual_family_income || 250000,
    income_certificate_available: profile?.income_certificate_available ?? true,
    academic_percentage: profile?.academic_percentage || 82.5,
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
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Fully Eligible
          </span>
        );
      case 'POTENTIALLY_ELIGIBLE':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> Potentially Eligible
          </span>
        );
      case 'INELIGIBLE':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1.5">
            <XCircle className="w-3.5 h-3.5 text-rose-600" /> Ineligible
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300 flex items-center gap-1.5">
            <HelpCircle className="w-3.5 h-3.5 text-slate-500" /> Insufficient Info
          </span>
        );
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Title */}
      <div className="text-center max-w-3xl mx-auto mb-8">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-50 text-brand-700 text-xs font-bold border border-brand-200 mb-2">
          <UserCheck className="w-4 h-4 text-brand-600" />
          Deterministic Python Verification Engine
        </div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">
          Find My Scholarship Eligibility
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Answer a few questions to see exactly which central and state opportunities you qualify for,
          backed by official department rules.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Questionnaire Form */}
        <div className="lg:col-span-1 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-sm font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
            <FileText className="w-4 h-4 text-brand-600" />
            Your Academic & Social Profile
          </h2>

          <form onSubmit={handleEvaluate} className="space-y-4 text-xs">
            {/* State */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">State / UT of Residence</label>
              <select
                value={formData.state_or_ut}
                onChange={(e) => setFormData({ ...formData, state_or_ut: e.target.value })}
                className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-800"
              >
                {indianStates.map((st) => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>
            </div>

            {/* Education Level */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Current Education Level</label>
              <select
                value={formData.education_level}
                onChange={(e) => setFormData({ ...formData, education_level: e.target.value })}
                className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-800"
              >
                <option value="CLASS_1_10">School (Class 1-10)</option>
                <option value="CLASS_11_12">Class 11 - 12 (HSC)</option>
                <option value="DIPLOMA">Polytechnic / Diploma</option>
                <option value="UNDERGRADUATE">Undergraduate (UG: B.Tech, MBBS, B.Com, BA)</option>
                <option value="POSTGRADUATE">Postgraduate (PG: M.Tech, MBA, M.Sc)</option>
                <option value="PHD_RESEARCH">M.Phil / PhD / Research Fellowship</option>
              </select>
            </div>

            {/* Annual Income */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Annual Family Income (₹)
              </label>
              <input
                type="number"
                value={formData.annual_family_income}
                onChange={(e) => setFormData({ ...formData, annual_family_income: Number(e.target.value) })}
                className="w-full p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
              <div className="flex items-center gap-1.5 mt-1.5">
                <input
                  type="checkbox"
                  id="incCert"
                  checked={formData.income_certificate_available}
                  onChange={(e) => setFormData({ ...formData, income_certificate_available: e.target.checked })}
                  className="rounded text-brand-600"
                />
                <label htmlFor="incCert" className="text-[11px] text-slate-500">
                  Income Certificate Available / Applyable
                </label>
              </div>
            </div>

            {/* Academic Percentage */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Previous Exam Marks / Percentage (%)
              </label>
              <input
                type="number"
                step="0.1"
                value={formData.academic_percentage}
                onChange={(e) => setFormData({ ...formData, academic_percentage: Number(e.target.value) })}
                className="w-full p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>

            {/* Social Category */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Social Reservation Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-800"
              >
                <option value="GENERAL">General / Unreserved</option>
                <option value="OBC">Other Backward Classes (OBC)</option>
                <option value="SC">Scheduled Castes (SC)</option>
                <option value="ST">Scheduled Tribes (ST)</option>
                <option value="EWS">Economically Weaker Section (EWS)</option>
              </select>
            </div>

            {/* Gender */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Gender</label>
              <div className="flex gap-4">
                {['MALE', 'FEMALE', 'TRANSGENDER'].map((g) => (
                  <label key={g} className="flex items-center gap-1.5 text-[11px] font-medium text-slate-700">
                    <input
                      type="radio"
                      name="gender"
                      value={g}
                      checked={formData.gender === g}
                      onChange={() => setFormData({ ...formData, gender: g })}
                      className="text-brand-600"
                    />
                    {g.charAt(0) + g.slice(1).toLowerCase()}
                  </label>
                ))}
              </div>
            </div>

            {/* Disability / PwD */}
            <div className="pt-2 border-t border-slate-100">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_disabled}
                  onChange={(e) => setFormData({ ...formData, is_disabled: e.target.checked })}
                  className="rounded text-brand-600"
                />
                <span className="font-semibold text-slate-700 text-[11px]">
                  Person with Benchmark Disability (PwD)
                </span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-md shadow-brand-500/20 flex items-center justify-center gap-2 transition-all mt-4"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Evaluating Rules...
                </>
              ) : (
                <>
                  Evaluate Eligibility Across Database <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Results Panel */}
        <div className="lg:col-span-2">
          {!results ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center h-full flex flex-col items-center justify-center">
              <div className="w-14 h-14 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mb-3">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="font-bold text-slate-900 text-base">Click "Evaluate Eligibility" to begin</h3>
              <p className="text-xs text-slate-500 max-w-sm mt-1">
                The engine will evaluate your profile criteria against all registered central and state government schemes.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200">
                <p className="text-xs font-bold text-slate-800">
                  Evaluated {results.length} schemes against your profile:
                </p>
                <div className="flex gap-2 text-xs">
                  <span className="font-bold text-emerald-600">
                    {results.filter((r) => r.status === 'ELIGIBLE' || r.status === 'POTENTIALLY_ELIGIBLE').length} Matches
                  </span>
                </div>
              </div>

              {results.map((res, idx) => (
                <div
                  key={idx}
                  className={`bg-white rounded-2xl border p-5 transition-all ${
                    res.status === 'ELIGIBLE'
                      ? 'border-emerald-300 shadow-sm shadow-emerald-500/5'
                      : res.status === 'POTENTIALLY_ELIGIBLE'
                      ? 'border-amber-200 shadow-sm'
                      : 'border-slate-200 opacity-80'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-3">
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{res.opportunity_title}</h4>
                      <p className="text-xs text-slate-500 font-medium">{res.provider}</p>
                    </div>
                    <div>{getStatusBadge(res.status)}</div>
                  </div>

                  {/* Matched conditions */}
                  {res.matched_conditions?.length > 0 && (
                    <div className="mb-2">
                      <p className="text-[11px] font-bold text-emerald-700 mb-1">Matched Criteria:</p>
                      <ul className="space-y-1 text-xs text-slate-600">
                        {res.matched_conditions.map((m: string, i: number) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                            <span>{m}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Failed conditions */}
                  {res.failed_conditions?.length > 0 && (
                    <div className="mb-2">
                      <p className="text-[11px] font-bold text-rose-700 mb-1">Unmet Mandatory Criteria:</p>
                      <ul className="space-y-1 text-xs text-rose-600">
                        {res.failed_conditions.map((f: string, i: number) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <XCircle className="w-3.5 h-3.5 text-rose-500 flex-shrink-0 mt-0.5" />
                            <span>{f}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Unconfirmed conditions */}
                  {res.unconfirmed_conditions?.length > 0 && (
                    <div className="mb-3">
                      <p className="text-[11px] font-bold text-amber-700 mb-1">Verification Required:</p>
                      <ul className="space-y-1 text-xs text-amber-800">
                        {res.unconfirmed_conditions.map((u: string, i: number) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                            <span>{u}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-[11px] text-slate-400">
                      Confidence: <strong>{res.confidence_score}%</strong>
                    </span>
                    {res.official_url && (
                      <a
                        href={res.official_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1"
                      >
                        Official Portal <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
