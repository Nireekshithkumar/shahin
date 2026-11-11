import React, { useState, useEffect } from 'react';
import {
  Landmark, Tractor, ShieldCheck, ExternalLink,
  Briefcase, Heart, Home, ArrowRight, FileText
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
    { id: 'HEALTH_SCHEME', name: 'Healthcare & Insurance', icon: Heart },
    { id: 'PENSION', name: 'Pensions & Senior Welfare', icon: ShieldCheck },
    { id: 'EMPLOYMENT_BENEFIT', name: 'Employment & Skills', icon: Briefcase },
    { id: 'SUBSIDY', name: 'Subsidies & Direct Benefits', icon: Home },
  ];

  useEffect(() => {
    const fetchSchemes = async () => {
      setLoading(true);
      try {
        const params: Record<string, any> = { opportunity_type: 'GOVERNMENT_SCHEME' };
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-[#000000]">
      {/* Header */}
      <div className="mb-6 pb-4 border-b border-[#D2D2D4]">
        <h1 className="text-2xl font-bold tracking-tight text-[#000000]">
          Government Schemes Directory
        </h1>
        <p className="text-xs text-[#000000]/60 mt-1">
          Direct welfare entitlements, farmer subsidies, pension schemes, and healthcare benefits from Central and State Ministries.
        </p>
      </div>

      {/* Category Filter Pills */}
      <div className="flex gap-1.5 overflow-x-auto pb-3 mb-6 scrollbar-none">
        {categories.map((cat) => {
          const Icon = cat.icon;
          const active = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                active
                  ? 'bg-[#FF634A] text-[#FFFFFF]'
                  : 'bg-[#E7E7E7] text-[#000000] border border-[#D2D2D4] hover:border-[#000000]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {cat.name}
            </button>
          );
        })}
      </div>

      {/* Scheme Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-48 rounded-xl bg-[#E7E7E7] animate-pulse" />
          ))}
        </div>
      ) : schemes.length === 0 ? (
        <div className="text-center py-16 bg-[#E7E7E7] rounded-xl border border-[#D2D2D4] p-8">
          <Landmark className="w-10 h-10 text-[#000000]/30 mx-auto mb-2" />
          <h3 className="text-xs font-bold text-[#000000]">No schemes found in this category</h3>
          <p className="text-xs text-[#000000]/60 mt-1">Select "All Schemes" to view all active welfare entitlements.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {schemes.map((scheme) => (
            <div
              key={scheme.id}
              className="bg-[#E7E7E7] rounded-xl border border-[#D2D2D4] p-5 flex flex-col justify-between hover:border-[#000000] transition-colors"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#FFFFFF] text-[#000000] border border-[#D2D2D4]">
                    {scheme.opportunity_type.replace(/_/g, ' ')}
                  </span>
                  <span className="text-[10px] font-bold text-[#FF634A] uppercase tracking-wider">
                    {scheme.applicable_state || 'All India'}
                  </span>
                </div>

                <h3 className="font-bold text-[#000000] text-xs line-clamp-2 mb-1">
                  {scheme.title}
                </h3>
                <p className="text-[11px] text-[#000000]/60 mb-3 truncate">{scheme.provider}</p>

                <p className="text-xs text-[#000000]/70 line-clamp-3 mb-4 leading-relaxed">
                  {scheme.short_description}
                </p>

                {scheme.benefit_description && (
                  <div className="p-2.5 rounded-lg bg-[#FFFFFF] border border-[#D2D2D4] mb-4 text-xs">
                    <span className="text-[10px] font-bold uppercase text-[#000000]/50 block">Entitlement</span>
                    <span className="font-semibold text-[#000000] text-xs">{scheme.benefit_description}</span>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-[#D2D2D4] flex items-center justify-between">
                <span className="text-[10px] text-[#000000]/60 flex items-center gap-1 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#FF634A]" />
                  Gazette Verified
                </span>

                <a
                  href={scheme.official_application_url || scheme.official_information_url || 'https://www.myscheme.gov.in'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-[#FF634A] hover:bg-[#E5533D] text-[#FFFFFF] text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  Apply on Portal <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
