import React, { useState, useEffect } from 'react';
import {
  Landmark, HeartPulse, Tractor, Home, Briefcase,
  ShieldCheck, ExternalLink, Search, CheckCircle2, FileText, ChevronRight
} from 'lucide-react';
import { opportunityService } from '../services/scholarsetuService';
import { Opportunity } from '../types';

export const GovernmentSchemesPage: React.FC = () => {
  const [schemes, setSchemes] = useState<Opportunity[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const categories = [
    { id: 'ALL', name: 'All Schemes', icon: Landmark },
    { id: 'AGRICULTURE_BENEFIT', name: 'Agriculture & Farmers', icon: Tractor },
    { id: 'HEALTH_SCHEME', name: 'Healthcare & Insurance', icon: HeartPulse },
    { id: 'PENSION', name: 'Pensions & Senior Welfare', icon: ShieldCheck },
    { id: 'EMPLOYMENT_BENEFIT', name: 'Employment & Skills', icon: Briefcase },
    { id: 'DISABILITY_BENEFIT', name: 'Disability Benefits (PwD)', icon: HeartPulse },
    { id: 'SUBSIDY', name: 'Subsidies & Financial Aid', icon: Home },
  ];

  useEffect(() => {
    const fetchSchemes = async () => {
      setLoading(true);
      try {
        const params: Record<string, any> = {};
        if (selectedCategory !== 'ALL') {
          params.type = selectedCategory;
        }
        if (search) {
          params.search = search;
        }
        const res = await opportunityService.getOpportunities(params);
        setSchemes(res.results || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchSchemes();
  }, [selectedCategory, search]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8 text-center max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200 mb-3">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          Central & State Citizen Welfare Directory
        </div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">
          Government Schemes for Indian Citizens
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-2">
          Discover healthcare, agricultural benefits, pension entitlements, and social assistance
          subsidies backed by the Government of India and State Ministries.
        </p>
      </div>

      {/* Category Pills */}
      <div className="flex gap-2 overflow-x-auto pb-4 mb-6 scrollbar-none justify-start sm:justify-center">
        {categories.map((cat) => {
          const Icon = cat.icon;
          const active = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                active
                  ? 'bg-brand-600 text-white shadow-md shadow-brand-500/20'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              {cat.name}
            </button>
          );
        })}
      </div>

      {/* Scheme Cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-64 rounded-2xl bg-white border border-slate-200 animate-pulse" />
          ))}
        </div>
      ) : schemes.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 p-8">
          <Landmark className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-slate-800">No schemes found in this category</h3>
          <p className="text-xs text-slate-500 mt-1">Select "All Schemes" to view all central and state welfare programs.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {schemes.map((scheme) => (
            <div
              key={scheme.id}
              className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                    {scheme.opportunity_type.replace(/_/g, ' ')}
                  </span>
                  <span className="text-[11px] font-semibold text-slate-500">
                    {scheme.applicable_state}
                  </span>
                </div>

                <h3 className="font-bold text-slate-900 text-sm mb-1.5">
                  {scheme.title}
                </h3>
                <p className="text-xs text-slate-500 font-medium mb-3">{scheme.provider}</p>

                <p className="text-xs text-slate-600 line-clamp-3 mb-4 leading-relaxed">
                  {scheme.short_description}
                </p>

                {scheme.benefit_description && (
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 mb-4 text-xs">
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Entitlement & Benefit</p>
                    <p className="font-bold text-emerald-700 mt-0.5">{scheme.benefit_description}</p>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-400 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  Official Source
                </span>

                <a
                  href={scheme.official_application_url || scheme.official_information_url || 'https://www.myscheme.gov.in'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
                >
                  Official Portal <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
