import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search, ShieldCheck, ArrowRight, Clock,
  Calendar, HelpCircle, Compass, FileCheck2, Calculator, Users2, Mic
} from 'lucide-react';
import { opportunityService } from '../services/scholarsetuService';
import { Opportunity } from '../types';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [featuredOpps, setFeaturedOpps] = useState<Opportunity[]>([]);
  const [closingSoonOpps, setClosingSoonOpps] = useState<Opportunity[]>([]);
  const [selectedState, setSelectedState] = useState<string>('All India');
  const [loading, setLoading] = useState(true);

  const indianStates = [
    'All India', 'Karnataka', 'Maharashtra', 'Uttar Pradesh', 'Tamil Nadu',
    'West Bengal', 'Kerala', 'Delhi', 'Gujarat', 'Rajasthan', 'Bihar',
    'Andhra Pradesh', 'Telangana', 'Punjab', 'Madhya Pradesh', 'Odisha'
  ];

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [featured, closing] = await Promise.all([
          opportunityService.getFeatured(),
          opportunityService.getClosingSoon(),
        ]);
        setFeaturedOpps(featured);
        setClosingSoonOpps(closing);
      } catch (err) {
        console.error('Failed to load homepage data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/scholarships?search=${encodeURIComponent(searchTerm.trim())}`);
    } else {
      navigate('/scholarships');
    }
  };

  const handleStateSelect = (state: string) => {
    setSelectedState(state);
    if (state === 'All India') {
      navigate('/scholarships');
    } else {
      navigate(`/scholarships?state=${encodeURIComponent(state)}`);
    }
  };

  return (
    <div className="bg-[#F4F4F6] min-h-screen text-[#000000]">
      {/* 1. HERO SECTION */}
      <section className="border-b border-[#D2D2D4] bg-[#F4F4F6] py-16 sm:py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          {/* Institutional Trust Badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-[#E7E7E7] border border-[#D2D2D4] text-[11px] font-bold text-[#000000] mb-6">
            <ShieldCheck className="w-3.5 h-3.5 text-[#FF634A]" />
            Official Indian Central & State Government Opportunity Registry
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight mb-4 text-[#000000]">
            Every Eligible Opportunity,{' '}
            <span className="text-[#FF634A]">One Platform.</span>
          </h1>

          <p className="text-xs sm:text-sm text-[#000000]/70 max-w-2xl mx-auto mb-8 leading-relaxed font-medium">
            Discover verified scholarships, welfare schemes, and tuition assistance programs across all 28 States and 8 Union Territories with deterministic eligibility matching.
          </p>

          {/* Search Bar Form */}
          <form onSubmit={handleSearch} className="max-w-2xl mx-auto mb-8">
            <div className="flex flex-col sm:flex-row gap-2 bg-[#E7E7E7] p-2 rounded-xl border border-[#D2D2D4]">
              <div className="flex-1 relative flex items-center">
                <Search className="w-4 h-4 text-[#000000]/40 absolute left-3.5" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by scholarship name, state, course, or department..."
                  className="w-full pl-10 pr-4 py-2.5 text-xs bg-[#FFFFFF] text-[#000000] rounded-lg border border-[#D2D2D4] focus:outline-none focus:border-[#FF634A]"
                />
              </div>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-lg bg-[#FF634A] hover:bg-[#E5533D] text-[#FFFFFF] font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                Find Opportunities
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>

          {/* Quick Action Shortcuts */}
          <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
            <Link
              to="/eligibility"
              className="px-4 py-2 rounded-lg bg-[#FF634A] hover:bg-[#E5533D] text-[#FFFFFF] font-bold transition-colors"
            >
              Check My Eligibility
            </Link>
            <Link
              to="/schemes"
              className="px-4 py-2 rounded-lg bg-[#E7E7E7] hover:bg-[#D2D2D4] border border-[#D2D2D4] text-[#000000] font-bold transition-colors"
            >
              Browse Government Schemes
            </Link>
            <Link
              to="/ai-assistant"
              className="px-4 py-2 rounded-lg bg-[#E7E7E7] hover:bg-[#D2D2D4] border border-[#D2D2D4] text-[#000000] font-bold transition-colors flex items-center gap-1.5"
            >
              <Mic className="w-3.5 h-3.5 text-[#FF634A]" />
              Voice AI Assistant
            </Link>
          </div>
        </div>
      </section>

      {/* 2. STATS BAR */}
      <section className="bg-[#E7E7E7] border-b border-[#D2D2D4] py-6 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div className="p-2">
            <p className="text-2xl font-black text-[#000000]">100%</p>
            <p className="text-[11px] font-semibold text-[#000000]/60 uppercase tracking-wider mt-0.5">Verified Official Sources</p>
          </div>
          <div className="p-2">
            <p className="text-2xl font-black text-[#000000]">28 States & 8 UTs</p>
            <p className="text-[11px] font-semibold text-[#000000]/60 uppercase tracking-wider mt-0.5">Pan-India Coverage</p>
          </div>
          <div className="p-2">
            <p className="text-2xl font-black text-[#FF634A]">Deterministic</p>
            <p className="text-[11px] font-semibold text-[#000000]/60 uppercase tracking-wider mt-0.5">Zero-Hallucination Matching</p>
          </div>
          <div className="p-2">
            <p className="text-2xl font-black text-[#000000]">100% Free</p>
            <p className="text-[11px] font-semibold text-[#000000]/60 uppercase tracking-wider mt-0.5">Open Citizen Governance</p>
          </div>
        </div>
      </section>

      {/* 3. NINE AI CAPABILITIES SUMMARY */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="mb-6">
          <h2 className="text-lg font-bold text-[#000000] tracking-tight">
            Integrated Intelligent Welfare Infrastructure
          </h2>
          <p className="text-xs text-[#000000]/60">
            Advanced features designed for Indian students, rural families, and citizens.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            to="/document-readiness"
            className="p-4 rounded-xl bg-[#E7E7E7] border border-[#D2D2D4] hover:border-[#000000] transition-colors"
          >
            <div className="w-8 h-8 rounded-md bg-[#000000] text-[#FFFFFF] flex items-center justify-center mb-3">
              <FileCheck2 className="w-4 h-4 text-[#FF634A]" />
            </div>
            <h3 className="text-xs font-bold text-[#000000] mb-1">Doc Readiness Checker</h3>
            <p className="text-[11px] text-[#000000]/70 leading-relaxed">
              OCR text extraction, FY validity verification, and 12-digit Aadhaar masking.
            </p>
          </Link>

          <Link
            to="/ai-assistant"
            className="p-4 rounded-xl bg-[#E7E7E7] border border-[#D2D2D4] hover:border-[#000000] transition-colors"
          >
            <div className="w-8 h-8 rounded-md bg-[#000000] text-[#FFFFFF] flex items-center justify-center mb-3">
              <Mic className="w-4 h-4 text-[#FF634A]" />
            </div>
            <h3 className="text-xs font-bold text-[#000000] mb-1">Voice AI Assistant</h3>
            <p className="text-[11px] text-[#000000]/70 leading-relaxed">
              Real-time voice query answering and speech output in Kannada, Hindi, and English.
            </p>
          </Link>

          <Link
            to="/benefit-calculator"
            className="p-4 rounded-xl bg-[#E7E7E7] border border-[#D2D2D4] hover:border-[#000000] transition-colors"
          >
            <div className="w-8 h-8 rounded-md bg-[#000000] text-[#FFFFFF] flex items-center justify-center mb-3">
              <Calculator className="w-4 h-4 text-[#FF634A]" />
            </div>
            <h3 className="text-xs font-bold text-[#000000] mb-1">Benefit Calculator</h3>
            <p className="text-[11px] text-[#000000]/70 leading-relaxed">
              Tuition waiver and monthly hosteller stipend evaluation with anti-duplication rules.
            </p>
          </Link>

          <Link
            to="/family-discovery"
            className="p-4 rounded-xl bg-[#E7E7E7] border border-[#D2D2D4] hover:border-[#000000] transition-colors"
          >
            <div className="w-8 h-8 rounded-md bg-[#000000] text-[#FFFFFF] flex items-center justify-center mb-3">
              <Users2 className="w-4 h-4 text-[#FF634A]" />
            </div>
            <h3 className="text-xs font-bold text-[#000000] mb-1">Family Scheme Matching</h3>
            <p className="text-[11px] text-[#000000]/70 leading-relaxed">
              Targeted schemes for elderly parents, farmers (PM-KISAN), and school children.
            </p>
          </Link>
        </div>
      </section>

      {/* 4. STATE FILTER PILLS */}
      <section className="py-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-[#D2D2D4]">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#000000]">
            Browse Schemes by Jurisdiction
          </h2>
          <Link to="/scholarships" className="text-xs font-semibold text-[#FF634A] hover:underline">
            View All
          </Link>
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-none">
          {indianStates.map((st) => (
            <button
              key={st}
              onClick={() => handleStateSelect(st)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                selectedState === st
                  ? 'bg-[#FF634A] text-[#FFFFFF] font-bold'
                  : 'bg-[#E7E7E7] text-[#000000] border border-[#D2D2D4] hover:border-[#000000]'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </section>

      {/* 5. FEATURED OPPORTUNITIES */}
      <section className="py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-base font-bold text-[#000000] tracking-tight">
              Featured Government Scholarships & Schemes
            </h2>
            <p className="text-xs text-[#000000]/60">
              National programs with verified guidelines and direct application portals.
            </p>
          </div>
          <Link
            to="/scholarships"
            className="text-xs font-semibold text-[#FF634A] hover:underline flex items-center gap-1"
          >
            All Scholarships <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 rounded-xl bg-[#E7E7E7] animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {featuredOpps.map((opp) => (
              <div
                key={opp.id}
                className="bg-[#E7E7E7] rounded-xl border border-[#D2D2D4] p-5 flex flex-col justify-between hover:border-[#000000] transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#FFFFFF] text-[#000000] border border-[#D2D2D4]">
                      {opp.applicable_state || 'All India'}
                    </span>
                    <span className="text-[10px] font-bold text-[#FF634A] uppercase tracking-wider">
                      Verified
                    </span>
                  </div>

                  <h3 className="font-bold text-[#000000] text-xs leading-snug line-clamp-2 mb-1">
                    {opp.title}
                  </h3>
                  <p className="text-[11px] text-[#000000]/60 mb-3 truncate">
                    {opp.provider}
                  </p>
                  <p className="text-xs text-[#000000]/80 line-clamp-3 mb-4 leading-relaxed">
                    {opp.short_description}
                  </p>
                </div>

                <div className="pt-3 border-t border-[#D2D2D4] flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#000000]/50 block">Benefit</span>
                    <span className="text-xs font-bold text-[#000000]">
                      {opp.benefit_amount ? `₹${Number(opp.benefit_amount).toLocaleString('en-IN')}` : opp.benefit_description || 'Grant'}
                    </span>
                  </div>
                  <Link
                    to={`/scholarships?id=${opp.id}`}
                    className="px-3 py-1.5 rounded-md bg-[#FFFFFF] hover:bg-[#D2D2D4] text-[#000000] border border-[#D2D2D4] text-xs font-bold transition-colors"
                  >
                    View Details
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 6. CLOSING SOON */}
      <section className="bg-[#E7E7E7] border-y border-[#D2D2D4] py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-[#000000] uppercase tracking-wider flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#FF634A]" />
                Upcoming Application Deadlines
              </h2>
              <p className="text-xs text-[#000000]/60">
                Ensure all required certificates are verified prior to the portal closing date.
              </p>
            </div>
            <Link to="/deadlines" className="text-xs font-semibold text-[#FF634A] hover:underline">
              View Calendar
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {closingSoonOpps.map((opp) => (
              <div
                key={opp.id}
                className="bg-[#FFFFFF] rounded-lg border border-[#D2D2D4] p-3 flex items-center justify-between"
              >
                <div className="pr-3 overflow-hidden">
                  <h4 className="text-xs font-bold text-[#000000] truncate">{opp.title}</h4>
                  <p className="text-[10px] text-[#000000]/60 truncate">{opp.provider}</p>
                  <p className="text-[10px] font-semibold text-[#FF634A] mt-0.5">
                    Deadline: {opp.application_closing_date || 'Open'}
                  </p>
                </div>
                <Link
                  to={`/scholarships?id=${opp.id}`}
                  className="px-2.5 py-1 rounded bg-[#E7E7E7] hover:bg-[#D2D2D4] text-[#000000] text-[11px] font-bold flex-shrink-0"
                >
                  View
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. FREQUENTLY ASKED QUESTIONS */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-xl font-bold text-[#000000] tracking-tight">Frequently Asked Questions</h2>
          <p className="text-xs text-[#000000]/60 mt-1">Official guidance on Indian scholarship verification and portals</p>
        </div>

        <div className="space-y-3">
          {[
            {
              q: "How does ScholarSetu AI check eligibility without hallucination?",
              a: "ScholarSetu AI uses a 100% deterministic Python rules engine. We compare your verified profile data (education level, domicile state, annual income ceiling, and category) against published government criteria. AI is strictly used to summarize guidelines, not to decide eligibility."
            },
            {
              q: "Can I apply directly on government portals from ScholarSetu AI?",
              a: "Yes. Every opportunity in our catalog includes verified direct links to the official government application portal (such as scholarships.gov.in, myscheme.gov.in, or state portals). Submissions occur safely on the government's authenticated domain."
            },
            {
              q: "What documents are required for post-matric scholarships?",
              a: "Standard requirements include: (1) Aadhaar Card linked to an active bank account (DBT enabled), (2) Current Financial Year Income Certificate issued by Tahsildar/Revenue Officer, (3) Caste/Community certificate if applicable, (4) Previous academic marksheets, and (5) College Bonafide/Fee receipt."
            },
            {
              q: "Is there any fee to use ScholarSetu AI?",
              a: "No. ScholarSetu AI is free for all Indian citizens and students. Official government scholarship applications never charge application fees."
            }
          ].map((item, idx) => (
            <div key={idx} className="p-4 rounded-xl bg-[#E7E7E7] border border-[#D2D2D4]">
              <h4 className="text-xs font-bold text-[#000000] flex items-center gap-2 mb-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-[#FF634A] flex-shrink-0" />
                {item.q}
              </h4>
              <p className="text-xs text-[#000000]/70 leading-relaxed pl-5 font-normal">
                {item.a}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
