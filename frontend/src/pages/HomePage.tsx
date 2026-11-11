import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search, Sparkles, CheckCircle2, Clock, Landmark, GraduationCap,
  ArrowRight, ShieldCheck, TrendingUp, Building2, MapPin, ChevronRight,
  ExternalLink, Calendar, HelpCircle, Star, Filter
} from 'lucide-react';
import { opportunityService } from '../services/scholarsetuService';
import { Opportunity } from '../types';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [featuredOpps, setFeaturedOpps] = useState<Opportunity[]>([]);
  const [closingSoonOpps, setClosingSoonOpps] = useState<Opportunity[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'central' | 'state'>('all');
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
    <div className="min-h-screen">
      {/* 1. HERO SECTION */}
      <section className="relative overflow-hidden hero-gradient text-white py-16 sm:py-24 px-4 sm:px-6 lg:px-8">
        {/* Subtle decorative circles */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 rounded-full bg-brand-500/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-96 h-96 rounded-full bg-saffron-500/10 blur-3xl" />

        <div className="relative max-w-5xl mx-auto text-center">
          {/* Trust badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs font-semibold text-amber-300 mb-6 shadow-sm">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            100% Traceable Indian Schemes & Scholarships Database
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-tight mb-4">
            Every Eligible Opportunity,{' '}
            <span className="bg-gradient-to-r from-amber-300 via-orange-300 to-emerald-400 bg-clip-text text-transparent">
              One Platform.
            </span>
          </h1>

          <p className="text-sm sm:text-base lg:text-lg text-slate-300 max-w-3xl mx-auto mb-8 leading-relaxed">
            Discover Central and State Government scholarships, fellowships, tuition fee waivers,
            and citizen benefits tailored to your education, caste category, and annual family income.
          </p>

          {/* Search Bar Form */}
          <form onSubmit={handleSearch} className="max-w-3xl mx-auto mb-8">
            <div className="flex flex-col sm:flex-row gap-2 bg-white/10 backdrop-blur-md p-2 rounded-2xl border border-white/20 shadow-2xl">
              <div className="flex-1 relative flex items-center">
                <Search className="w-5 h-5 text-slate-400 absolute left-4" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by scholarship name, course, state, category or scheme..."
                  className="w-full pl-12 pr-4 py-3 text-sm bg-white text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 placeholder:text-slate-400 shadow-inner"
                />
              </div>
              <button
                type="submit"
                className="px-6 py-3 rounded-xl bg-saffron-600 hover:bg-saffron-500 text-white font-bold text-sm shadow-lg shadow-saffron-600/30 flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                Find Opportunities
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>

          {/* Dual Call to Actions */}
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-bold">
            <Link
              to="/eligibility"
              className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white shadow-md flex items-center gap-2 transition-all hover:-translate-y-0.5"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-300" />
              Check My Eligibility (2 Mins)
            </Link>
            <Link
              to="/schemes"
              className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white flex items-center gap-2 transition-all hover:-translate-y-0.5"
            >
              <Landmark className="w-4 h-4 text-amber-300" />
              Discover Government Schemes
            </Link>
            <Link
              to="/ai-assistant"
              className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white flex items-center gap-2 transition-all hover:-translate-y-0.5"
            >
              <Sparkles className="w-4 h-4 text-brand-300" />
              AI Scholarship Assistant
            </Link>
          </div>
        </div>
      </section>

      {/* 2. STATS & SOURCE COVERAGE BAR */}
      <section className="bg-white border-b border-slate-200 py-6 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div className="p-3">
            <p className="text-2xl sm:text-3xl font-black text-brand-700">100%</p>
            <p className="text-xs font-semibold text-slate-500 mt-1">Verified Official Sources</p>
          </div>
          <div className="p-3">
            <p className="text-2xl sm:text-3xl font-black text-emerald-600">28 States & 8 UTs</p>
            <p className="text-xs font-semibold text-slate-500 mt-1">Comprehensive Indian Coverage</p>
          </div>
          <div className="p-3">
            <p className="text-2xl sm:text-3xl font-black text-saffron-600">₹500+ Cr</p>
            <p className="text-xs font-semibold text-slate-500 mt-1">Direct Benefit Subsidies Tracked</p>
          </div>
          <div className="p-3">
            <p className="text-2xl sm:text-3xl font-black text-slate-800">Deterministic</p>
            <p className="text-xs font-semibold text-slate-500 mt-1">Zero-Hallucination Rules Engine</p>
          </div>
        </div>
      </section>

      {/* 3. STATE-WISE OPPORTUNITY EXPLORER */}
      <section className="py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-saffron-600" />
              Explore Schemes by State & Union Territory
            </h2>
            <p className="text-xs text-slate-500">Filter central and state departmental welfare programs</p>
          </div>
          <Link to="/scholarships" className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1">
            View All <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
          {indianStates.map((st) => (
            <button
              key={st}
              onClick={() => handleStateSelect(st)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                selectedState === st
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'bg-white border border-slate-200 text-slate-700 hover:border-brand-300'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </section>

      {/* 4. RECOMMENDED & FEATURED SCHOLARSHIPS */}
      <section className="py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-500 fill-amber-400" />
              <h2 className="text-xl font-bold text-slate-900">Featured & High-Impact Opportunities</h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">Top-rated central, technical, and social welfare programs across India</p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/scholarships"
              className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1"
            >
              Browse Full Catalog <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-64 rounded-2xl bg-slate-100 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredOpps.map((opp) => (
              <div
                key={opp.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-brand-50 text-brand-700 border border-brand-200">
                      {opp.applicable_state}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" />
                      Verified
                    </span>
                  </div>

                  <h3 className="font-bold text-slate-900 text-sm group-hover:text-brand-600 transition-colors line-clamp-2 mb-1.5">
                    {opp.title}
                  </h3>

                  <p className="text-xs text-slate-500 font-medium mb-3">
                    {opp.provider}
                  </p>

                  <p className="text-xs text-slate-600 line-clamp-3 mb-4 leading-relaxed">
                    {opp.short_description}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-slate-400 font-medium">Financial Benefit</p>
                    <p className="text-xs font-black text-emerald-600">
                      {opp.benefit_amount ? `₹${Number(opp.benefit_amount).toLocaleString('en-IN')}` : 'Direct Grant'}
                      <span className="text-[10px] text-slate-500 font-normal"> / {opp.benefit_frequency}</span>
                    </p>
                  </div>

                  <Link
                    to={`/scholarships?id=${opp.id}`}
                    className="px-3 py-1.5 rounded-lg bg-brand-50 hover:bg-brand-100 text-brand-700 text-xs font-bold transition-colors flex items-center gap-1"
                  >
                    Details <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 5. CLOSING SOON SECTION WITH DEADLINE COUNTDOWN */}
      <section className="bg-amber-50/60 border-y border-amber-200/80 py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center shadow-sm">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Opportunities Closing Soon</h2>
                <p className="text-xs text-slate-500">Apply before deadline to ensure document verification</p>
              </div>
            </div>
            <Link to="/deadlines" className="text-xs font-bold text-amber-700 hover:underline flex items-center gap-1">
              View Calendar <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {closingSoonOpps.map((opp) => (
              <div
                key={opp.id}
                className="bg-white rounded-xl border border-amber-200 p-4 shadow-sm hover:border-amber-400 transition-colors flex items-center justify-between"
              >
                <div className="pr-3">
                  <h4 className="text-xs font-bold text-slate-900 line-clamp-1">{opp.title}</h4>
                  <p className="text-[11px] text-slate-500 truncate">{opp.provider}</p>
                  <p className="text-[11px] font-semibold text-amber-700 mt-1 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Deadline: {opp.application_closing_date}
                  </p>
                </div>
                <Link
                  to={`/scholarships?id=${opp.id}`}
                  className="px-2.5 py-1.5 rounded-lg bg-amber-100 text-amber-800 text-xs font-bold hover:bg-amber-200 flex-shrink-0"
                >
                  View
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. AI ASSISTANT & ELIGIBILITY CTA BANNER */}
      <section className="py-14 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-brand-900 via-indigo-900 to-slate-900 text-white p-8 sm:p-12 shadow-2xl">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-500/20 text-brand-300 text-xs font-bold border border-brand-500/30 mb-4">
              <Sparkles className="w-3.5 h-3.5" />
              Grounded AI Engine
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight mb-3">
              Unsure which scheme matches your family's profile?
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mb-6 leading-relaxed">
              Ask our RAG-powered Scholarship Assistant questions about required documents,
              income ceiling certificates, and official application methods. Every answer is
              directly cited from official ministry guidelines.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/ai-assistant"
                className="px-5 py-2.5 rounded-xl bg-white text-brand-900 font-bold text-xs hover:bg-slate-100 shadow-md transition-all flex items-center gap-1.5"
              >
                <Sparkles className="w-4 h-4 text-brand-600" />
                Ask Assistant Now
              </Link>
              <Link
                to="/workflows"
                className="px-5 py-2.5 rounded-xl bg-white/10 text-white border border-white/20 font-bold text-xs hover:bg-white/20 transition-all flex items-center gap-1.5"
              >
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                Try Visual Workflow Builder
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 7. FREQUENTLY ASKED QUESTIONS */}
      <section className="py-10 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-slate-900">Frequently Asked Questions</h2>
          <p className="text-xs text-slate-500 mt-1">Authentic guidance on official Indian scholarship portals</p>
        </div>

        <div className="space-y-3">
          {[
            {
              q: "How does ScholarSetu AI check my eligibility without hallucination?",
              a: "ScholarSetu AI uses a 100% deterministic Python rules engine. We compare your verified profile data (education level, domicile state, annual income ceiling, and category) against the official published criteria of each scheme. AI is only used to summarize guidelines, not to decide eligibility."
            },
            {
              q: "Can I apply directly on government portals from ScholarSetu AI?",
              a: "Yes. Every opportunity in our database includes verified direct links to the official government application website (such as scholarships.gov.in, myscheme.gov.in, or state scholarship portals). You complete official submissions safely on the government's authenticated portal."
            },
            {
              q: "What documents are commonly required for Indian post-matric scholarships?",
              a: "Most schemes require: (1) Aadhaar Card linked to an active bank account, (2) Current Year Income Certificate issued by Tahsildar/Revenue Officer, (3) Caste/Community certificate if applicable, (4) Previous academic marksheets, and (5) College Bonafide/Fee receipt."
            },
            {
              q: "Is there any fee to discover scholarships on ScholarSetu AI?",
              a: "No. ScholarSetu AI is free for all Indian citizens and students. Government schemes do not charge discovery fees, and all official government scholarship applications are free of charge."
            }
          ].map((item, idx) => (
            <div key={idx} className="p-4 rounded-xl bg-white border border-slate-200">
              <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2 mb-1.5">
                <HelpCircle className="w-4 h-4 text-brand-600 flex-shrink-0" />
                {item.q}
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed pl-6">
                {item.a}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
