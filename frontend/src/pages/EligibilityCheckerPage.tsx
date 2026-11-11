import React, { useState } from 'react';
import {
  CheckCircle2, AlertTriangle, XCircle, HelpCircle,
  ShieldCheck, RefreshCw, FileText, ExternalLink, UserCheck
} from 'lucide-react';
import { eligibilityService } from '../services/scholarsetuService';
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
            <CheckCircle2 className="w-3.5 h-3.5" /> Fully Eligible
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
            <XCircle className="w-3.5 h-3.5" /> Ineligible
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

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-[#000000]">
      {/* Title */}
      <div className="mb-6 pb-4 border-b border-[#D2D2D4]">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#E7E7E7] border border-[#D2D2D4] text-[10px] font-bold text-[#000000] mb-2 uppercase tracking-wider">
          <UserCheck className="w-3.5 h-3.5 text-[#FF634A]" />
          Deterministic Rules Engine
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-[#000000]">
          Deterministic Eligibility Checker
        </h1>
        <p className="text-xs text-[#000000]/60 mt-1">
          Verify your eligibility against official government criteria without AI hallucination.
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
              <label className="block text-[11px] font-bold text-[#000000] mb-1">State of Domicile</label>
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
                <option value="UNDERGRADUATE">Undergraduate (UG)</option>
                <option value="POSTGRADUATE">Postgraduate (PG)</option>
                <option value="DIPLOMA">Diploma</option>
                <option value="CLASS_11_12">Class 11 - 12</option>
                <option value="CLASS_1_10">Class 1 - 10</option>
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
              <label className="block text-[11px] font-bold text-[#000000] mb-1">Academic Percentage (%)</label>
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
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Evaluating...
                  </>
                ) : (
                  'Run Deterministic Evaluation'
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Results Panel */}
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
              <h3 className="text-sm font-bold text-[#000000]">No eligible opportunities found</h3>
              <p className="text-xs text-[#000000]/60 mt-1">Try adjusting the income or education level parameters.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-[#D2D2D4]">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#000000]">
                  Matching Evaluations ({results.length})
                </h3>
              </div>

              {results.map((res: any, idx: number) => (
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

                  <p className="text-xs text-[#000000]/80 leading-relaxed bg-[#FFFFFF] p-3 rounded-lg border border-[#D2D2D4]">
                    {res.explanation}
                  </p>

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

                  <div className="pt-2 border-t border-[#D2D2D4] flex items-center justify-between text-xs">
                    <span className="text-[10px] text-[#000000]/50 font-bold uppercase">Confidence: {res.confidence_score}%</span>
                    {res.official_url && (
                      <a
                        href={res.official_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#FF634A] font-bold hover:underline flex items-center gap-1 text-[11px]"
                      >
                        Official Application Link <ExternalLink className="w-3 h-3" />
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
