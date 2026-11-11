import React, { useState, useEffect } from 'react';
import {
  FileCheck2, Upload, AlertCircle, CheckCircle2,
  Trash2, RefreshCw, FileText, Calendar, ShieldCheck, Eye, ExternalLink
} from 'lucide-react';
import { documentService, opportunityService } from '../services/scholarsetuService';
import { useAuth } from '../context/AuthContext';
import { Opportunity } from '../types';

export const DocumentReadinessPage: React.FC = () => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<any[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [selectedOppId, setSelectedOppId] = useState<number | null>(null);
  const [readinessReport, setReadinessReport] = useState<any | null>(null);

  const [uploading, setUploading] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [selectedDocType, setSelectedDocType] = useState<string>('INCOME_CERTIFICATE');

  useEffect(() => {
    loadDocuments();
    loadOpportunities();
  }, [user]);

  const loadDocuments = async () => {
    if (!user) return;
    try {
      const docs = await documentService.getDocuments();
      setDocuments(docs);
    } catch (e: any) {
      console.error(e);
    }
  };

  const loadOpportunities = async () => {
    try {
      const res = await opportunityService.getOpportunities({ page_size: 20 });
      setOpportunities(res.results || []);
      if (res.results && res.results.length > 0) {
        setSelectedOppId(res.results[0].id);
        runReadinessCheck(res.results[0].id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setSuccessMsg(null);
    setUploading(true);

    try {
      const res = await documentService.uploadDocument(file, selectedDocType);
      setSuccessMsg(`Document '${file.name}' processed. Extracted type: ${res.document_type_display}`);
      await loadDocuments();
      if (selectedOppId) {
        await runReadinessCheck(selectedOppId);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to upload and analyze document.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDeleteDoc = async (id: number) => {
    if (!confirm('Remove this document from storage?')) return;
    try {
      await documentService.deleteDocument(id);
      await loadDocuments();
      if (selectedOppId) {
        await runReadinessCheck(selectedOppId);
      }
    } catch (err: any) {
      setError('Failed to delete document.');
    }
  };

  const runReadinessCheck = async (oppId: number) => {
    setEvaluating(true);
    try {
      const report = await documentService.checkReadiness(oppId);
      setReadinessReport(report);
    } catch (err) {
      console.error(err);
    } finally {
      setEvaluating(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-[#000000]">
      {/* Title */}
      <div className="mb-6 pb-4 border-b border-[#D2D2D4]">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#E7E7E7] border border-[#D2D2D4] text-[10px] font-bold text-[#000000] mb-2 uppercase tracking-wider">
          <ShieldCheck className="w-3.5 h-3.5 text-[#FF634A]" />
          Feature 1: OCR Verification Engine
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-[#000000]">
          AI Document Readiness Checker
        </h1>
        <p className="text-xs text-[#000000]/60 mt-1">
          Upload certificates to extract verification text, check readability & expiry, and audit readiness against scheme requirements.
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-[#E7E7E7] border border-[#FF634A]/50 text-[#000000] text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-[#FF634A] flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="mb-4 p-3 rounded-lg bg-[#E7E7E7] border border-[#D2D2D4] text-[#000000] text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-[#FF634A] flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload & Document Library */}
        <div className="lg:col-span-1 space-y-4">
          {/* Upload Card */}
          <div className="bg-[#E7E7E7] rounded-xl border border-[#D2D2D4] p-5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#000000] mb-3 flex items-center gap-1.5">
              <Upload className="w-4 h-4 text-[#FF634A]" />
              Upload Document for OCR
            </h2>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-[#000000] mb-1">Document Category</label>
                <select
                  value={selectedDocType}
                  onChange={(e) => setSelectedDocType(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-[#FFFFFF] border border-[#D2D2D4] rounded-md text-[#000000] focus:border-[#FF634A] focus:outline-none"
                >
                  <option value="INCOME_CERTIFICATE">Income Certificate</option>
                  <option value="CASTE_CERTIFICATE">Caste / Category Certificate</option>
                  <option value="MARKSHEET_10TH">10th Standard Marksheet</option>
                  <option value="MARKSHEET_12TH">12th Standard Marksheet</option>
                  <option value="RATION_CARD">Ration Card (BPL / AAY)</option>
                  <option value="DISABILITY_CERTIFICATE">Disability Certificate</option>
                  <option value="BONAFIDE_CERTIFICATE">Bonafide Student Certificate</option>
                  <option value="OTHER">Other Official Document</option>
                </select>
              </div>

              <div className="border border-dashed border-[#D2D2D4] bg-[#FFFFFF] rounded-lg p-5 text-center">
                <input
                  type="file"
                  id="doc-upload"
                  accept=".pdf,.png,.jpg,.jpeg"
                  className="hidden"
                  onChange={handleFileUpload}
                  disabled={uploading}
                />
                <label htmlFor="doc-upload" className="cursor-pointer block">
                  <FileText className="w-8 h-8 text-[#000000]/40 mx-auto mb-2" />
                  <span className="text-xs font-bold text-[#FF634A] hover:underline block">
                    {uploading ? 'Processing OCR Extraction...' : 'Select Certificate File'}
                  </span>
                  <span className="text-[10px] text-[#000000]/50 block mt-1">PDF, PNG, JPG (Max 10MB)</span>
                </label>
              </div>
            </div>
          </div>

          {/* Uploaded Documents List */}
          <div className="bg-[#E7E7E7] rounded-xl border border-[#D2D2D4] p-5">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#D2D2D4]">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#000000]">
                Verified Storage ({documents.length})
              </h2>
            </div>

            {documents.length === 0 ? (
              <p className="text-xs text-[#000000]/60 text-center py-6">
                No documents uploaded yet. Upload certificates to check readiness.
              </p>
            ) : (
              <div className="space-y-2">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="p-3 bg-[#FFFFFF] rounded-lg border border-[#D2D2D4] flex items-center justify-between"
                  >
                    <div className="overflow-hidden pr-2">
                      <p className="text-xs font-bold text-[#000000] truncate">{doc.document_type_display || doc.document_type}</p>
                      <p className="text-[10px] text-[#000000]/60">
                        Readability: <strong className="text-[#000000]">{doc.readability_score}%</strong>
                        {doc.financial_year && ` • FY: ${doc.financial_year}`}
                      </p>
                      {doc.masked_identifier && (
                        <p className="text-[10px] text-[#FF634A] font-mono mt-0.5">
                          ID: {doc.masked_identifier}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => handleDeleteDoc(doc.id)}
                      className="p-1 text-[#000000]/40 hover:text-[#FF634A] transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Readiness Audit Results */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-[#E7E7E7] rounded-xl border border-[#D2D2D4] p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-[#D2D2D4]">
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-[#000000]">
                  Audit Target Scholarship
                </h2>
                <p className="text-[11px] text-[#000000]/60">Evaluate your uploaded documents against scheme criteria</p>
              </div>

              <select
                value={selectedOppId || ''}
                onChange={(e) => {
                  const id = Number(e.target.value);
                  setSelectedOppId(id);
                  runReadinessCheck(id);
                }}
                className="px-3 py-1.5 text-xs bg-[#FFFFFF] border border-[#D2D2D4] rounded-md text-[#000000] font-semibold focus:border-[#FF634A]"
              >
                {opportunities.map((opp) => (
                  <option key={opp.id} value={opp.id}>
                    {opp.title} ({opp.applicable_state})
                  </option>
                ))}
              </select>
            </div>

            {evaluating ? (
              <div className="text-center py-12">
                <RefreshCw className="w-6 h-6 animate-spin text-[#FF634A] mx-auto mb-2" />
                <p className="text-xs text-[#000000]/60">Auditing document readiness...</p>
              </div>
            ) : readinessReport ? (
              <div className="space-y-4">
                {/* Readiness Progress Bar */}
                <div className="p-4 bg-[#FFFFFF] rounded-lg border border-[#D2D2D4]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-[#000000]">Overall Document Readiness Score</span>
                    <span className="text-sm font-black text-[#FF634A]">{readinessReport.readiness_percentage}%</span>
                  </div>
                  <div className="w-full h-2.5 bg-[#E7E7E7] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#FF634A] transition-all duration-300"
                      style={{ width: `${readinessReport.readiness_percentage}%` }}
                    />
                  </div>
                </div>

                {/* Requirements Checklist */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#000000] mb-2">
                    Document Checklist & Audit Status
                  </h3>
                  <div className="space-y-2">
                    {readinessReport.requirements?.map((req: any, rIdx: number) => (
                      <div
                        key={rIdx}
                        className="p-3 bg-[#FFFFFF] rounded-lg border border-[#D2D2D4] flex items-start justify-between gap-3"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-[#000000]">{req.document_name}</span>
                            {req.status === 'VERIFIED' ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#FF634A] text-[#FFFFFF]">
                                Verified
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#E7E7E7] text-[#000000] border border-[#D2D2D4]">
                                Missing / Pending
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-[#000000]/70">{req.guideline}</p>
                          {req.remarks && (
                            <p className="text-[10px] text-[#FF634A] font-semibold">{req.remarks}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-[#000000]/60 text-center py-8">Select a scholarship to audit readiness.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
