import React from 'react';
import { HelpCircle, Phone, Mail, ShieldCheck, FileCheck, ExternalLink } from 'lucide-react';

export const HelpCenterPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Help Center & Official Resources</h1>
        <p className="text-xs text-slate-500 mt-1">
          Guidance on authentic Indian scholarship portals, helpline numbers, and document guidelines.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div className="p-5 rounded-2xl bg-white border border-slate-200">
          <div className="w-8 h-8 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center mb-2">
            <Phone className="w-4 h-4" />
          </div>
          <h3 className="font-bold text-slate-900 text-sm mb-1">National Scholarship Portal (NSP) Helpdesk</h3>
          <p className="text-xs text-slate-600 mb-2">For technical issues with student registration, OTR, or DBT status:</p>
          <p className="font-bold text-brand-700 text-xs">0120 - 6619540</p>
          <p className="text-[11px] text-slate-500">helpdesk@nsp.gov.in</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <h3 className="font-bold text-slate-900 text-sm mb-1">myScheme Citizen Helpdesk</h3>
          <p className="text-xs text-slate-600 mb-2">For queries regarding central and state government schemes:</p>
          <p className="font-bold text-emerald-700 text-xs">1800 - 111 - 555</p>
          <p className="text-[11px] text-slate-500">support@myscheme.gov.in</p>
        </div>
      </div>

      {/* Document preparation checklist */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm mb-8">
        <h3 className="font-bold text-slate-900 text-sm mb-3 flex items-center gap-2">
          <FileCheck className="w-4 h-4 text-brand-600" />
          General Document Preparation Checklist
        </h3>
        <div className="space-y-2 text-xs text-slate-600">
          <p>
            <strong>1. Aadhaar Card & Bank Seeding:</strong> Your Aadhaar number must be seeded with your active bank account for Direct Benefit Transfer (DBT).
          </p>
          <p>
            <strong>2. Income Certificate:</strong> Must be issued by a competent revenue authority (Tahsildar / Revenue Inspector) and valid for the current financial year.
          </p>
          <p>
            <strong>3. Caste / Community Certificate:</strong> Required for SC, ST, OBC, or EWS category quotas with official barcode or digital signature.
          </p>
          <p>
            <strong>4. Bonafide Student Certificate:</strong> Issued by the Head of Institution or Principal certifying current year enrollment.
          </p>
        </div>
      </div>
    </div>
  );
};
