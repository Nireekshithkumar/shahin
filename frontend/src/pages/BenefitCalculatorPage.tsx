import React, { useState, useEffect } from 'react';
import {
  Calculator, CheckCircle2, AlertTriangle, ArrowRight,
  ShieldCheck, IndianRupee, RefreshCw
} from 'lucide-react';
import { opportunityService } from '../services/scholarsetuService';
import { Opportunity } from '../types';

export const BenefitCalculatorPage: React.FC = () => {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [selectedOppId, setSelectedOppId] = useState<number | null>(null);
  const [educationLevel, setEducationLevel] = useState<string>('UNDERGRADUATE');
  const [isHosteller, setIsHosteller] = useState<boolean>(false);
  const [courseYears, setCourseYears] = useState<number>(3);
  const [annualIncome, setAnnualIncome] = useState<string>('250000');

  const [calculationResult, setCalculationResult] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadOpportunities();
  }, []);

  const loadOpportunities = async () => {
    try {
      const res = await opportunityService.getOpportunities({ page_size: 50 });
      setOpportunities(res.results || []);
      if (res.results && res.results.length > 0) {
        setSelectedOppId(res.results[0].id);
        calculate(res.results[0].id, educationLevel, isHosteller, courseYears, 250000);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const calculate = async (
    oppId: number,
    edu: string,
    hostel: boolean,
    years: number,
    income: number
  ) => {
    setLoading(true);
    setError(null);
    try {
      const res = await opportunityService.calculateBenefit({
        opportunity_id: oppId,
        education_level: edu,
        is_hosteller: hostel,
        course_years: years,
        annual_income: income,
      });
      setCalculationResult(res);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to calculate benefits.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOppId) return;
    calculate(selectedOppId, educationLevel, isHosteller, courseYears, Number(annualIncome || 0));
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-[#000000]">
      {/* Title */}
      <div className="mb-6 pb-4 border-b border-[#D2D2D4]">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#E7E7E7] border border-[#D2D2D4] text-[10px] font-bold text-[#000000] mb-2 uppercase tracking-wider">
          <Calculator className="w-3.5 h-3.5 text-[#FF634A]" />
          Feature 6: Anti-Duplication Rules Engine
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-[#000000]">
          Government Benefit & Scholarship Calculator
        </h1>
        <p className="text-xs text-[#000000]/60 mt-1">
          Evaluate fee reimbursements, living allowances, and multi-year totals with anti-duplication rules.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Parameters Form */}
        <div className="lg:col-span-1 bg-[#E7E7E7] rounded-xl border border-[#D2D2D4] p-5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#000000] mb-4 pb-2 border-b border-[#D2D2D4]">
            Student & Course Details
          </h2>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-[11px] font-bold text-[#000000] mb-1">Target Scheme</label>
              <select
                value={selectedOppId || ''}
                onChange={(e) => setSelectedOppId(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 text-xs bg-[#FFFFFF] border border-[#D2D2D4] rounded-md text-[#000000] focus:border-[#FF634A] focus:outline-none"
              >
                {opportunities.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#000000] mb-1">Education Level</label>
              <select
                value={educationLevel}
                onChange={(e) => setEducationLevel(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs bg-[#FFFFFF] border border-[#D2D2D4] rounded-md text-[#000000] focus:border-[#FF634A] focus:outline-none"
              >
                <option value="UNDERGRADUATE">Undergraduate (B.Tech, B.Sc, B.Com)</option>
                <option value="POSTGRADUATE">Postgraduate (M.Tech, M.Sc, MBA)</option>
                <option value="DIPLOMA">Polytechnic / Diploma</option>
                <option value="CLASS_11_12">Higher Secondary (Class 11 - 12)</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-bold text-[#000000] mb-1">Course Duration</label>
                <select
                  value={courseYears}
                  onChange={(e) => setCourseYears(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 text-xs bg-[#FFFFFF] border border-[#D2D2D4] rounded-md text-[#000000] focus:border-[#FF634A] focus:outline-none"
                >
                  <option value={1}>1 Year</option>
                  <option value={2}>2 Years</option>
                  <option value={3}>3 Years</option>
                  <option value={4}>4 Years</option>
                  <option value={5}>5 Years</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#000000] mb-1">Annual Family Income</label>
                <input
                  type="number"
                  value={annualIncome}
                  onChange={(e) => setAnnualIncome(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-[#FFFFFF] border border-[#D2D2D4] rounded-md text-[#000000] focus:border-[#FF634A] focus:outline-none"
                />
              </div>
            </div>

            <div className="p-3 bg-[#FFFFFF] rounded-lg border border-[#D2D2D4]">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isHosteller}
                  onChange={(e) => setIsHosteller(e.target.checked)}
                  className="rounded text-[#FF634A] focus:ring-[#FF634A]"
                />
                <span className="text-xs font-bold text-[#000000]">Staying in College Hostel (Hosteller)</span>
              </label>
              <p className="text-[10px] text-[#000000]/60 mt-1 pl-5">
                Hostellers receive higher monthly allowances under central government guidelines.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-md bg-[#FF634A] hover:bg-[#E5533D] text-[#FFFFFF] font-bold text-xs transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'Calculate Entitlement'}
            </button>
          </form>
        </div>

        {/* Results Panel */}
        <div className="lg:col-span-2">
          {calculationResult ? (
            <div className="space-y-4">
              {/* Grand Total Card */}
              <div className="bg-[#E7E7E7] rounded-xl border border-[#D2D2D4] p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#000000]/60">
                      Estimated Multi-Year Benefit ({calculationResult.course_years} Years)
                    </span>
                    <h3 className="text-2xl font-black text-[#FF634A] mt-1">
                      ₹{Number(calculationResult.total_estimated_benefit || 0).toLocaleString('en-IN')}
                    </h3>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#000000]/60">
                      Annual Entitlement
                    </span>
                    <p className="text-base font-bold text-[#000000] mt-0.5">
                      ₹{Number(calculationResult.annual_tuition_fee + (calculationResult.annual_living_allowance || 0)).toLocaleString('en-IN')} / year
                    </p>
                  </div>
                </div>
              </div>

              {/* Breakdown */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-[#E7E7E7] rounded-xl border border-[#D2D2D4] p-4">
                  <span className="text-[10px] font-bold uppercase text-[#000000]/60">Tuition Assistance</span>
                  <p className="text-lg font-bold text-[#000000] mt-1">
                    ₹{Number(calculationResult.annual_tuition_fee || 0).toLocaleString('en-IN')}
                  </p>
                  <p className="text-[11px] text-[#000000]/70 mt-1">Direct college fee waiver per year</p>
                </div>

                <div className="bg-[#E7E7E7] rounded-xl border border-[#D2D2D4] p-4">
                  <span className="text-[10px] font-bold uppercase text-[#000000]/60">Living & Book Allowance</span>
                  <p className="text-lg font-bold text-[#000000] mt-1">
                    ₹{Number(calculationResult.annual_living_allowance || 0).toLocaleString('en-IN')}
                  </p>
                  <p className="text-[11px] text-[#000000]/70 mt-1">
                    {calculationResult.is_hosteller ? 'Hosteller rates applied' : 'Day scholar rates applied'}
                  </p>
                </div>
              </div>

              {/* Anti-Duplication Rule Notice */}
              <div className="bg-[#E7E7E7] rounded-xl border border-[#D2D2D4] p-4 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-[#000000]">
                  <ShieldCheck className="w-4 h-4 text-[#FF634A]" />
                  Anti-Duplication Enforcement Rule
                </div>
                <p className="text-xs text-[#000000]/70 leading-relaxed">
                  {calculationResult.anti_duplication_notice ||
                    'Students cannot draw tuition maintenance allowances simultaneously from multiple government sources. Only one scholarship can be availed per academic year.'}
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-[#E7E7E7] rounded-xl border border-[#D2D2D4] p-12 text-center">
              <Calculator className="w-10 h-10 text-[#000000]/30 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-[#000000]">Calculation Ready</h3>
              <p className="text-xs text-[#000000]/60 max-w-sm mx-auto mt-1">
                Configure your course and hostel status to evaluate your verified benefits.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
