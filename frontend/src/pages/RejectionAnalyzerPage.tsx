import React, { useState } from 'react';
import {
  Upload, AlertCircle, RefreshCw, FileText,
  ShieldAlert, ExternalLink
} from 'lucide-react';
import { aiAssistantService } from '../services/scholarsetuService';

export const RejectionAnalyzerPage: React.FC = () => {
  const [rejectionText, setRejectionText] = useState('');
  const [rejectionFile, setRejectionFile] = useState<File | null>(null);
  const [analysis, setAnalysis] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sampleTexts = [
    {
      label: 'Sample: Income Certificate Expired',
      text: 'Application Rejected. Declared annual family income exceeds ceiling or Income Certificate RD validity period is expired for the current academic session.'
    },
    {
      label: 'Sample: Marksheet Below Cutoff',
      text: 'Disqualified under Merit Round. Qualifying academic percentage (64.50%) is below minimum department category cutoff (75.00%).'
    },
    {
      label: 'Sample: NPCI Aadhaar Seeding Error',
      text: 'DBT Payment Failed. Error Code: NPCI-04. Bank account is not seeded with Aadhaar in the National Payments Corporation of India mapper.'
    }
  ];

  const handleAnalyze = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!rejectionText && !rejectionFile) {
      setError('Please enter rejection text or upload a document file.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await aiAssistantService.analyzeRejection(rejectionText, rejectionFile || undefined);
      setAnalysis(res);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to analyze rejection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-[#000000]">
      {/* Title */}
      <div className="mb-6 pb-4 border-b border-[#D2D2D4]">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#E7E7E7] border border-[#D2D2D4] text-[10px] font-bold text-[#000000] mb-2 uppercase tracking-wider">
          <ShieldAlert className="w-3.5 h-3.5 text-[#FF634A]" />
          Feature 5: Grievance & Error Diagnosis
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-[#000000]">
          AI Rejection Reason Analyzer
        </h1>
        <p className="text-xs text-[#000000]/60 mt-1">
          Scan rejection notices to decipher administrative error codes, clarify rejection grounds, and discover official appeal remedies.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Input Form */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-[#E7E7E7] rounded-xl border border-[#D2D2D4] p-5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#000000] mb-3 flex items-center gap-1.5">
              <Upload className="w-4 h-4 text-[#FF634A]" />
              Upload Rejection Letter or Slip
            </h2>

            <div className="border border-dashed border-[#D2D2D4] bg-[#FFFFFF] rounded-lg p-5 text-center mb-3">
              <input
                type="file"
                id="rej-upload"
                accept=".pdf,.png,.jpg,.jpeg"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) setRejectionFile(f);
                }}
              />
              <label htmlFor="rej-upload" className="cursor-pointer block">
                <FileText className="w-7 h-7 text-[#000000]/40 mx-auto mb-2" />
                <span className="text-xs font-bold text-[#FF634A] hover:underline block">
                  {rejectionFile ? rejectionFile.name : 'Choose File to Scan'}
                </span>
                <span className="text-[10px] text-[#000000]/50 block mt-1">
                  {rejectionFile ? `${(rejectionFile.size / 1024).toFixed(1)} KB` : 'PDF, JPG, PNG'}
                </span>
              </label>
            </div>

            <div className="mb-3">
              <label className="block text-[11px] font-bold text-[#000000] mb-1">Or Paste Rejection Remarks / SMS</label>
              <textarea
                rows={3}
                value={rejectionText}
                onChange={(e) => setRejectionText(e.target.value)}
                placeholder="Paste the rejection notice text here..."
                className="w-full px-2.5 py-1.5 text-xs bg-[#FFFFFF] border border-[#D2D2D4] rounded-md focus:border-[#FF634A] focus:outline-none"
              />
            </div>

            <button
              onClick={() => handleAnalyze()}
              disabled={loading || (!rejectionText && !rejectionFile)}
              className="w-full py-2.5 rounded-md bg-[#FF634A] hover:bg-[#E5533D] text-[#FFFFFF] font-bold text-xs transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Diagnosing Error Codes...
                </>
              ) : (
                'Diagnose Rejection Grounds'
              )}
            </button>
          </div>

          {/* Sample Prompts */}
          <div className="bg-[#E7E7E7] rounded-xl border border-[#D2D2D4] p-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#000000]/60 block mb-2">
              Common Example Rejections
            </span>
            <div className="space-y-1.5">
              {sampleTexts.map((sample, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setRejectionText(sample.text);
                    setRejectionFile(null);
                  }}
                  className="w-full text-left p-2 rounded bg-[#FFFFFF] hover:border-[#000000] border border-[#D2D2D4] text-xs transition-colors"
                >
                  <p className="font-bold text-[#000000]">{sample.label}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Diagnosis Results */}
        <div className="lg:col-span-2">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-[#E7E7E7] border border-[#FF634A] text-[#000000] text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-[#FF634A]" />
              <span>{error}</span>
            </div>
          )}

          {analysis ? (
            <div className="bg-[#E7E7E7] rounded-xl border border-[#D2D2D4] p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#D2D2D4]">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#000000]">
                    Diagnosis Report
                  </h3>
                  <p className="text-[11px] text-[#000000]/60">Plain-language explanation and rectification checklist</p>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#FF634A] text-[#FFFFFF]">
                  Analyzed
                </span>
              </div>

              {/* Plain Language Explanation */}
              <div className="p-3.5 bg-[#FFFFFF] rounded-lg border border-[#D2D2D4]">
                <span className="text-[10px] font-bold uppercase text-[#000000]/50 block mb-1">
                  Why This Application Was Rejected:
                </span>
                <p className="text-xs text-[#000000] leading-relaxed">
                  {analysis.explanation || analysis.plain_language_explanation}
                </p>
              </div>

              {/* Corrective Actions */}
              {analysis.corrective_actions && analysis.corrective_actions.length > 0 && (
                <div className="p-3.5 bg-[#FFFFFF] rounded-lg border border-[#D2D2D4]">
                  <span className="text-[10px] font-bold uppercase text-[#000000]/50 block mb-2">
                    Required Corrective Actions:
                  </span>
                  <ul className="space-y-1.5 text-xs text-[#000000] list-disc list-inside">
                    {analysis.corrective_actions.map((act: string, aIdx: number) => (
                      <li key={aIdx}>{act}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Appeal Paths */}
              {analysis.appeal_paths && analysis.appeal_paths.length > 0 && (
                <div className="p-3.5 bg-[#FFFFFF] rounded-lg border border-[#D2D2D4]">
                  <span className="text-[10px] font-bold uppercase text-[#000000]/50 block mb-2">
                    Official Grievance & Appeal Avenues:
                  </span>
                  <ul className="space-y-1 text-xs text-[#000000] list-disc list-inside">
                    {analysis.appeal_paths.map((p: string, pIdx: number) => (
                      <li key={pIdx}>{p}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-[#E7E7E7] rounded-xl border border-[#D2D2D4] p-12 text-center">
              <ShieldAlert className="w-10 h-10 text-[#000000]/30 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-[#000000]">No Rejection Notice Scanned</h3>
              <p className="text-xs text-[#000000]/60 max-w-sm mx-auto mt-1">
                Upload a rejection notice or paste error remarks on the left to diagnose why an application was rejected.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
