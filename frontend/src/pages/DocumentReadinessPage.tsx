import React, { useState, useEffect, useRef } from 'react';
import {
  FileCheck2, Upload, AlertCircle, CheckCircle2,
  Trash2, RefreshCw, FileText, Calendar, ShieldCheck, Eye, ExternalLink,
  Camera, Image as ImageIcon, Check, Clock, AlertTriangle, Edit3,
  Download, ArrowRight, UserCheck, ShieldAlert, X, ChevronRight, Search
} from 'lucide-react';
import { documentService, opportunityService } from '../services/scholarsetuService';
import { offlineService } from '../services/offlineService';
import { useAuth } from '../context/AuthContext';
import { Opportunity, UserDocumentItem, ProfileUpdateProposalItem, RenewalGuidanceItem } from '../types';
import { CameraCaptureModal } from '../components/common/CameraCaptureModal';

export const DocumentReadinessPage: React.FC = () => {
  const { user } = useAuth();

  // Active Main Tab: 'CERTIFICATES' | 'SCHEME_AUDIT'
  const [activeTab, setActiveTab] = useState<'CERTIFICATES' | 'SCHEME_AUDIT'>('CERTIFICATES');

  // Documents & Summary State
  const [documents, setDocuments] = useState<UserDocumentItem[]>([]);
  const [summary, setSummary] = useState<any>({
    total: 0,
    valid: 0,
    expiring_soon: 0,
    expired: 0,
    verification_required: 0,
    no_expiry_applicable: 0,
    pending_proposals_total: 0,
  });
  const [validityFilter, setValidityFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Opportunities for Readiness Audit
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [selectedOppId, setSelectedOppId] = useState<number | null>(null);
  const [readinessReport, setReadinessReport] = useState<any | null>(null);

  // Loading & Feedback
  const [uploading, setUploading] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [selectedDocType, setSelectedDocType] = useState<string>('INCOME_CERTIFICATE');

  // Camera Modal State
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const [replacingDocId, setReplacingDocId] = useState<number | null>(null);

  // Hidden File Inputs
  const deviceFileInputRef = useRef<HTMLInputElement | null>(null);
  const galleryFileInputRef = useRef<HTMLInputElement | null>(null);
  const replaceFileInputRef = useRef<HTMLInputElement | null>(null);

  // Modals
  // 1. Mandatory Profile Updates Review Modal
  const [isProposalModalOpen, setIsProposalModalOpen] = useState(false);
  const [activeDocForProposals, setActiveDocForProposals] = useState<UserDocumentItem | null>(null);
  const [currentProposals, setCurrentProposals] = useState<ProfileUpdateProposalItem[]>([]);
  const [decidingProposal, setDecidingProposal] = useState(false);

  // 2. Renewal Guidance Modal
  const [isRenewalModalOpen, setIsRenewalModalOpen] = useState(false);
  const [renewalGuidance, setRenewalGuidance] = useState<RenewalGuidanceItem | null>(null);
  const [loadingRenewal, setLoadingRenewal] = useState(false);

  // 3. Edit Extracted Details Modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<UserDocumentItem | null>(null);
  const [editFormData, setEditFormData] = useState<any>({});
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    loadDocuments();
    loadOpportunities();
  }, [user, validityFilter, searchQuery]);

  const loadDocuments = async () => {
    if (!user) return;
    try {
      const res = await documentService.getDocuments({
        validity_status: validityFilter,
        search: searchQuery.trim() || undefined,
      });
      setDocuments(res.results || []);
      if (res.summary) {
        setSummary(res.summary);
      }
    } catch (e: any) {
      console.error(e);
    }
  };

  const loadOpportunities = async () => {
    try {
      const res = await opportunityService.getOpportunities({ page_size: 20 });
      setOpportunities(res.results || []);
      if (res.results && res.results.length > 0 && !selectedOppId) {
        setSelectedOppId(res.results[0].id);
        runReadinessCheck(res.results[0].id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleFileUpload = async (files: FileList | File[] | null) => {
    if (!files || files.length === 0) return;

    setError(null);
    setSuccessMsg(null);
    setUploading(true);

    try {
      const fileList = Array.from(files);
      if (replacingDocId) {
        // Handle Document Replacement
        const res = await documentService.replaceDocument(replacingDocId, fileList);
        setSuccessMsg(`Certificate replaced successfully. Extracted type: ${res.document?.document_type_display || 'Document'}.`);
        setReplacingDocId(null);
        await loadDocuments();
        if (res.proposals && res.proposals.length > 0) {
          setActiveDocForProposals(res.document);
          setCurrentProposals(res.proposals);
          setIsProposalModalOpen(true);
        }
      } else {
        // Standard Upload
        const res = await documentService.uploadDocument(fileList, selectedDocType);
        const nameStr = fileList.length === 1 ? fileList[0].name : `${fileList.length} pages`;
        setSuccessMsg(`Document '${nameStr}' processed. Extracted type: ${res.document?.document_type_display || res.document_type_display}`);
        await loadDocuments();
        if (selectedOppId) {
          await runReadinessCheck(selectedOppId);
        }

        // If OCR extracted new fields differing from user profile, trigger mandatory review modal
        if (res.proposals && res.proposals.length > 0) {
          setActiveDocForProposals(res.document);
          setCurrentProposals(res.proposals);
          setIsProposalModalOpen(true);
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to upload and analyze document.');
    } finally {
      setUploading(false);
      if (deviceFileInputRef.current) deviceFileInputRef.current.value = '';
      if (galleryFileInputRef.current) galleryFileInputRef.current.value = '';
      if (replaceFileInputRef.current) replaceFileInputRef.current.value = '';
    }
  };

  const handleCameraCaptureComplete = async (capturedFiles: File[]) => {
    if (capturedFiles.length === 0) return;
    await handleFileUpload(capturedFiles);
  };

  const handleDeleteDoc = async (id: number) => {
    if (!confirm('Remove this document and associated monitoring schedules?')) return;
    try {
      await documentService.deleteDocument(id);
      await loadDocuments();
      if (selectedOppId) {
        await runReadinessCheck(selectedOppId);
      }
      setSuccessMsg('Document removed successfully.');
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

  // Open Proposal Review Modal
  const openProposalsForDoc = async (doc: UserDocumentItem) => {
    try {
      const proposals = await documentService.getDocumentProposals(doc.id);
      setActiveDocForProposals(doc);
      setCurrentProposals(proposals);
      setIsProposalModalOpen(true);
    } catch (err) {
      setError('Failed to load profile proposals for document.');
    }
  };

  // Handle Proposal Decision (Mandatory Consent)
  const handleProposalDecision = async (proposalId: number, decision: 'ACCEPTED' | 'REJECTED') => {
    if (!activeDocForProposals) return;
    setDecidingProposal(true);
    try {
      await documentService.decideProposal(activeDocForProposals.id, {
        proposal_id: proposalId,
        decision,
      });
      // Refresh proposals
      const updated = await documentService.getDocumentProposals(activeDocForProposals.id);
      setCurrentProposals(updated);
      await loadDocuments();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update proposal.');
    } finally {
      setDecidingProposal(false);
    }
  };

  // Handle Batch Proposal Action
  const handleBatchProposalAction = async (action: 'ACCEPT_ALL' | 'REJECT_ALL') => {
    if (!activeDocForProposals) return;
    setDecidingProposal(true);
    try {
      await documentService.decideProposal(activeDocForProposals.id, { action });
      const updated = await documentService.getDocumentProposals(activeDocForProposals.id);
      setCurrentProposals(updated);
      await loadDocuments();
      if (action === 'ACCEPT_ALL' || updated.every((p: any) => p.status !== 'PENDING')) {
        setTimeout(() => setIsProposalModalOpen(false), 800);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to process proposals.');
    } finally {
      setDecidingProposal(false);
    }
  };

  // Open Renewal Guidance Modal
  const openRenewalGuidance = async (doc: UserDocumentItem) => {
    setLoadingRenewal(true);
    setIsRenewalModalOpen(true);
    try {
      const res = await documentService.getRenewalGuidance(doc.id);
      setRenewalGuidance(res);
    } catch (err) {
      setError('Failed to fetch renewal instructions.');
      setIsRenewalModalOpen(false);
    } finally {
      setLoadingRenewal(false);
    }
  };

  // Open Edit Details Modal
  const openEditModal = (doc: UserDocumentItem) => {
    setEditingDoc(doc);
    setEditFormData({
      holder_name: doc.holder_name || '',
      certificate_number: doc.certificate_number || '',
      issue_date: doc.issue_date || '',
      expiry_date: doc.expiry_date || '',
      issuing_authority: doc.issuing_authority || '',
      state: doc.state || '',
      district: doc.district || '',
      annual_income: doc.annual_income || '',
      warning_period_days: doc.warning_period_days || 30,
    });
    setIsEditModalOpen(true);
  };

  // Save Edited Details
  const handleSaveEdit = async () => {
    if (!editingDoc) return;
    setSavingEdit(true);
    try {
      await documentService.updateDocument(editingDoc.id, editFormData);
      setIsEditModalOpen(false);
      setSuccessMsg('Certificate details updated and validity re-evaluated.');
      await loadDocuments();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update certificate details.');
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-[#000000]">
      {/* Top Header */}
      <div className="mb-6 pb-4 border-b border-[#D2D2D4]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#E7E7E7] border border-[#D2D2D4] text-[10px] font-bold text-[#000000] mb-2 uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5 text-[#FF634A]" />
              AI Certificate Validity &amp; Expiry Monitoring System
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-[#000000]">
              Document Tracker &amp; Certificate Hub
            </h1>
            <p className="text-xs text-[#000000]/70 mt-1 max-w-2xl">
              Comprehensive government document acquisition, OCR information extraction, configurable rule-based certificate validity tracking, and mandatory consent-driven profile updates.
            </p>
          </div>

          {/* Navigation View Switcher Tabs */}
          <div className="flex items-center gap-2 bg-[#E7E7E7] p-1 rounded-lg border border-[#D2D2D4] self-start sm:self-auto">
            <button
              onClick={() => setActiveTab('CERTIFICATES')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${
                activeTab === 'CERTIFICATES'
                  ? 'bg-[#FF634A] text-[#FFFFFF]'
                  : 'text-[#000000] hover:bg-[#D2D2D4]'
              }`}
            >
              My Certificates ({documents.length})
            </button>
            <button
              onClick={() => setActiveTab('SCHEME_AUDIT')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${
                activeTab === 'SCHEME_AUDIT'
                  ? 'bg-[#FF634A] text-[#FFFFFF]'
                  : 'text-[#000000] hover:bg-[#D2D2D4]'
              }`}
            >
              Scheme Readiness Audit
            </button>
          </div>
        </div>
      </div>

      {/* Global Alerts */}
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-[#E7E7E7] border border-[#FF634A]/50 text-[#000000] text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-[#FF634A] flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-[#000000]/60 hover:text-[#000000]">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMsg && (
        <div className="mb-4 p-3 rounded-lg bg-[#E7E7E7] border border-[#D2D2D4] text-[#000000] text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#FF634A] flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-[#000000]/60 hover:text-[#000000]">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Pending Profile Updates Action Banner (Mandatory Consent) */}
      {summary.pending_proposals_total > 0 && (
        <div className="mb-6 p-4 rounded-xl bg-[#E7E7E7] border border-[#FF634A] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#F4F4F6] border border-[#D2D2D4] flex items-center justify-center text-[#FF634A] flex-shrink-0">
              <UserCheck className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-[#000000]">
                {summary.pending_proposals_total} Pending Profile Update Proposal{summary.pending_proposals_total > 1 ? 's' : ''} Extracted from Certificates
              </p>
              <p className="text-[11px] text-[#000000]/70 mt-0.5">
                The OCR engine detected updated profile information (e.g. family income, district, or category). In accordance with data privacy regulations, your profile is never modified without explicit consent.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              const pendingDoc = documents.find((d) => d.pending_proposals_count > 0) || documents[0];
              if (pendingDoc) openProposalsForDoc(pendingDoc);
            }}
            className="px-3.5 py-2 rounded-lg bg-[#FF634A] hover:bg-[#E5533D] text-[#FFFFFF] text-xs font-bold transition-colors whitespace-nowrap self-start sm:self-auto flex items-center gap-1.5"
          >
            Review Profile Updates <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* TAB 1: MY CERTIFICATES & VALIDITY DASHBOARD */}
      {activeTab === 'CERTIFICATES' && (
        <div className="space-y-6">
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-[#E7E7E7] p-3.5 rounded-xl border border-[#D2D2D4]">
              <span className="text-[10px] uppercase font-bold text-[#000000]/60">Total Storage</span>
              <p className="text-xl font-black text-[#000000] mt-1">{summary.total}</p>
            </div>
            <div className="bg-[#E7E7E7] p-3.5 rounded-xl border border-[#D2D2D4]">
              <span className="text-[10px] uppercase font-bold text-[#000000]/60">Valid</span>
              <p className="text-xl font-black text-[#000000] mt-1">{summary.valid}</p>
            </div>
            <div className="bg-[#E7E7E7] p-3.5 rounded-xl border border-[#FF634A]/50">
              <span className="text-[10px] uppercase font-bold text-[#FF634A]">Expiring Soon</span>
              <p className="text-xl font-black text-[#FF634A] mt-1">{summary.expiring_soon}</p>
            </div>
            <div className="bg-[#E7E7E7] p-3.5 rounded-xl border border-[#D2D2D4]">
              <span className="text-[10px] uppercase font-bold text-[#000000]/60">Expired</span>
              <p className="text-xl font-black text-[#000000] mt-1">{summary.expired}</p>
            </div>
            <div className="bg-[#E7E7E7] p-3.5 rounded-xl border border-[#D2D2D4]">
              <span className="text-[10px] uppercase font-bold text-[#000000]/60">Verification Req.</span>
              <p className="text-xl font-black text-[#000000] mt-1">{summary.verification_required}</p>
            </div>
            <div className="bg-[#E7E7E7] p-3.5 rounded-xl border border-[#D2D2D4]">
              <span className="text-[10px] uppercase font-bold text-[#000000]/60">No Expiry</span>
              <p className="text-xl font-black text-[#000000] mt-1">{summary.no_expiry_applicable}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Acquisition & Upload Controls */}
            <div className="lg:col-span-1 space-y-4">
              <div className="bg-[#E7E7E7] rounded-xl border border-[#D2D2D4] p-5">
                <h2 className="text-xs font-bold uppercase tracking-wider text-[#000000] mb-3 flex items-center gap-1.5">
                  <Upload className="w-4 h-4 text-[#FF634A]" />
                  Document Acquisition
                </h2>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-[#000000] mb-1">Certificate Category</label>
                    <select
                      value={selectedDocType}
                      onChange={(e) => setSelectedDocType(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-[#FFFFFF] border border-[#D2D2D4] rounded-md text-[#000000] focus:border-[#FF634A] focus:outline-none"
                    >
                      <option value="INCOME_CERTIFICATE">Income Certificate</option>
                      <option value="CASTE_CERTIFICATE">Caste / Community Certificate</option>
                      <option value="EWS_CERTIFICATE">EWS Certificate</option>
                      <option value="DOMICILE_CERTIFICATE">Domicile / Residence Certificate</option>
                      <option value="RESIDENCE_CERTIFICATE">Residence Certificate</option>
                      <option value="DISABILITY_CERTIFICATE">Disability (PwD / UDID) Certificate</option>
                      <option value="NATIVITY_CERTIFICATE">Nativity Certificate</option>
                      <option value="MARKS_CARD">Marks Card / Grade Sheet</option>
                      <option value="BONAFIDE_CERTIFICATE">Bonafide / Study Certificate</option>
                      <option value="RATION_CARD">Ration Card (BPL / AAY)</option>
                      <option value="AADHAAR_CARD">Aadhaar Identity Document</option>
                      <option value="BANK_PASSBOOK">Bank Passbook / Cancelled Cheque</option>
                      <option value="ADMISSION_RECEIPT">Admission Proof / Fee Receipt</option>
                      <option value="OTHER">Other Government-Issued Certificate</option>
                    </select>
                  </div>

                  {/* Three Document Acquisition Options */}
                  <div className="space-y-2 pt-1">
                    {/* 1. Upload from Device */}
                    <input
                      ref={deviceFileInputRef}
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg"
                      multiple
                      className="hidden"
                      onChange={(e) => handleFileUpload(e.target.files)}
                      disabled={uploading}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setReplacingDocId(null);
                        deviceFileInputRef.current?.click();
                      }}
                      disabled={uploading}
                      className="w-full p-3 rounded-lg bg-[#FFFFFF] border border-[#D2D2D4] hover:border-[#000000] flex items-center justify-between text-left transition-colors group"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-[#F4F4F6] border border-[#D2D2D4] flex items-center justify-center text-[#FF634A]">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-[#000000]">Upload from Device</p>
                          <p className="text-[10px] text-[#000000]/60">Select PDF, JPG, or PNG document</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-[#FF634A] group-hover:underline">Browse</span>
                    </button>

                    {/* 2. Capture with Camera */}
                    <button
                      type="button"
                      onClick={() => {
                        setReplacingDocId(null);
                        setIsCameraModalOpen(true);
                      }}
                      disabled={uploading}
                      className="w-full p-3 rounded-lg bg-[#FFFFFF] border border-[#FF634A]/60 hover:border-[#FF634A] flex items-center justify-between text-left transition-colors group"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-[#FF634A] text-white flex items-center justify-center">
                          <Camera className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-[#000000]">Capture with Camera</p>
                          <p className="text-[10px] text-[#000000]/60">Live webcam or phone camera scanner</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-[#FF634A] group-hover:underline">Open Camera</span>
                    </button>

                    {/* 3. Choose from Gallery */}
                    <input
                      ref={galleryFileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => handleFileUpload(e.target.files)}
                      disabled={uploading}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setReplacingDocId(null);
                        galleryFileInputRef.current?.click();
                      }}
                      disabled={uploading}
                      className="w-full p-3 rounded-lg bg-[#FFFFFF] border border-[#D2D2D4] hover:border-[#000000] flex items-center justify-between text-left transition-colors group"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-[#F4F4F6] border border-[#D2D2D4] flex items-center justify-center text-[#000000]">
                          <ImageIcon className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-[#000000]">Choose from Gallery</p>
                          <p className="text-[10px] text-[#000000]/60">Photos, scans &amp; screenshots from device</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-[#000000]/70 group-hover:underline">Gallery</span>
                    </button>
                  </div>

                  {uploading && (
                    <div className="p-3 bg-[#FFFFFF] rounded-lg border border-[#D2D2D4] flex items-center gap-2 text-xs">
                      <RefreshCw className="w-4 h-4 animate-spin text-[#FF634A]" />
                      <span>Extracting OCR fields &amp; verifying validity rules...</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Information Note */}
              <div className="bg-[#E7E7E7] rounded-xl border border-[#D2D2D4] p-4 text-[11px] space-y-2 text-[#000000]/70">
                <p className="font-bold text-[#000000]">Validity Resolution Hierarchy:</p>
                <p>1. <strong>Explicit Date:</strong> Printed expiry date on physical certificate.</p>
                <p>2. <strong>Official State Rule:</strong> Verified government rule by state &amp; authority.</p>
                <p>3. <strong>Document Nature:</strong> Permanent records (marks card, caste in certain states).</p>
                <div className="pt-2 border-t border-[#D2D2D4] text-[10px] text-[#000000]/60">
                  Authenticity is tracked independently and requires official verification portals.
                </div>
              </div>
            </div>

            {/* Right Column: Certificate List & Controls */}
            <div className="lg:col-span-2 space-y-4">
              {/* Filter Tabs & Search Bar */}
              <div className="bg-[#E7E7E7] rounded-xl border border-[#D2D2D4] p-4 space-y-3">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                  {/* Search Input */}
                  <div className="relative w-full sm:w-64">
                    <Search className="w-3.5 h-3.5 text-[#000000]/40 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search certificate, holder, number..."
                      className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#FFFFFF] border border-[#D2D2D4] rounded-md text-[#000000] focus:border-[#FF634A] focus:outline-none"
                    />
                  </div>

                  {/* Filter Pills */}
                  <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
                    {[
                      { key: 'ALL', label: 'All' },
                      { key: 'VALID', label: 'Valid' },
                      { key: 'EXPIRING_SOON', label: 'Expiring Soon' },
                      { key: 'EXPIRED', label: 'Expired' },
                      { key: 'VERIFICATION_REQUIRED', label: 'Verification Req.' },
                      { key: 'NO_EXPIRY_APPLICABLE', label: 'No Expiry' },
                    ].map((f) => (
                      <button
                        key={f.key}
                        onClick={() => setValidityFilter(f.key)}
                        className={`px-2.5 py-1 rounded text-[11px] font-bold transition-colors ${
                          validityFilter === f.key
                            ? 'bg-[#000000] text-[#FFFFFF]'
                            : 'bg-[#FFFFFF] text-[#000000] border border-[#D2D2D4] hover:bg-[#D2D2D4]'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Certificate Cards */}
              {documents.length === 0 ? (
                <div className="bg-[#E7E7E7] rounded-xl border border-[#D2D2D4] p-12 text-center text-xs text-[#000000]/60 space-y-2">
                  <FileText className="w-8 h-8 text-[#000000]/30 mx-auto" />
                  <p className="font-bold text-[#000000]">No certificates found matching criteria.</p>
                  <p>Upload a certificate from device or use live camera capture to start monitoring.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {documents.map((doc) => {
                    const isExpiring = doc.validity_status === 'EXPIRING_SOON';
                    const isExpired = doc.validity_status === 'EXPIRED';
                    const isValid = doc.validity_status === 'VALID';
                    const isPermanent = doc.validity_status === 'NO_EXPIRY_APPLICABLE';

                    return (
                      <div
                        key={doc.id}
                        className={`bg-[#FFFFFF] rounded-xl border p-4 transition-all ${
                          isExpiring
                            ? 'border-[#FF634A] shadow-none'
                            : 'border-[#D2D2D4]'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-xs font-bold text-[#000000]">
                                {doc.document_type_display || doc.document_type}
                              </span>

                              {/* Validity Status Pill */}
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                                  isValid
                                    ? 'bg-[#E7E7E7] text-[#000000] border-[#D2D2D4]'
                                    : isExpiring
                                    ? 'bg-[#FF634A] text-[#FFFFFF] border-[#FF634A]'
                                    : isExpired
                                    ? 'bg-[#000000] text-[#FFFFFF] border-[#000000]'
                                    : isPermanent
                                    ? 'bg-[#E7E7E7] text-[#000000] border-[#D2D2D4]'
                                    : 'bg-[#F4F4F6] text-[#000000] border-[#D2D2D4]'
                                }`}
                              >
                                {doc.validity_status_display || doc.validity_status}
                              </span>

                              {/* Government Authenticity Pill */}
                              <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-[#F4F4F6] text-[#000000]/60 border border-[#D2D2D4]">
                                {doc.authenticity_status_display || 'Authenticity Not Verified'}
                              </span>
                            </div>

                            <p className="text-[11px] text-[#000000]/70">
                              Holder: <strong>{doc.holder_name || 'Not extracted'}</strong>
                              {doc.masked_certificate_number && doc.masked_certificate_number !== 'Not Available' && (
                                <span> • Cert No: <code className="font-mono text-[#000000]">{doc.masked_certificate_number}</code></span>
                              )}
                              {doc.state && <span> • State: {doc.state}</span>}
                              {doc.district && <span> • District: {doc.district}</span>}
                            </p>

                            <p className="text-[11px] text-[#000000]/60">
                              {doc.issue_date && <span>Issued: {doc.issue_date} • </span>}
                              {doc.expiry_date ? (
                                <span>
                                  Expires: <strong className="text-[#000000]">{doc.expiry_date}</strong>
                                  {doc.remaining_days !== null && doc.remaining_days !== undefined && (
                                    <span className={doc.remaining_days <= 30 ? ' text-[#FF634A] font-bold' : ''}>
                                      {' '}({doc.remaining_days >= 0 ? `${doc.remaining_days} days remaining` : `${Math.abs(doc.remaining_days)} days expired`})
                                    </span>
                                  )}
                                </span>
                              ) : isPermanent ? (
                                <span>Validity: <strong>Permanent / No Expiry Applicable</strong></span>
                              ) : (
                                <span>Validity: <strong>Verification Required</strong></span>
                              )}
                            </p>

                            {doc.issuing_authority && (
                              <p className="text-[10px] text-[#000000]/50">
                                Authority: {doc.issuing_authority}
                              </p>
                            )}

                            {/* Pending Proposals Pill */}
                            {doc.pending_proposals_count > 0 && (
                              <div className="pt-1">
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#FF634A]">
                                  <AlertCircle className="w-3 h-3" />
                                  {doc.pending_proposals_count} proposed profile field{doc.pending_proposals_count > 1 ? 's' : ''} awaiting your confirmation
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Action Buttons */}
                          <div className="flex flex-wrap items-center gap-2 self-start">
                            {/* Review Profile Updates Button */}
                            {doc.pending_proposals_count > 0 && (
                              <button
                                onClick={() => openProposalsForDoc(doc)}
                                className="px-2.5 py-1.5 rounded-lg bg-[#FF634A] hover:bg-[#E5533D] text-[#FFFFFF] text-[11px] font-bold transition-colors flex items-center gap-1"
                              >
                                <UserCheck className="w-3.5 h-3.5" /> Review Updates
                              </button>
                            )}

                            {/* Renewal Guidance Button (for Expiring Soon or Expired) */}
                            {(isExpiring || isExpired) && (
                              <button
                                onClick={() => openRenewalGuidance(doc)}
                                className="px-2.5 py-1.5 rounded-lg bg-[#E7E7E7] hover:bg-[#D2D2D4] border border-[#D2D2D4] text-[#000000] text-[11px] font-bold transition-colors flex items-center gap-1"
                              >
                                <Clock className="w-3.5 h-3.5 text-[#FF634A]" /> Renewal Guidance
                              </button>
                            )}

                            {/* Edit Extracted Information */}
                            <button
                              onClick={() => openEditModal(doc)}
                              className="p-1.5 rounded-lg bg-[#F4F4F6] hover:bg-[#D2D2D4] border border-[#D2D2D4] text-[#000000] transition-colors"
                              title="Edit Extracted Details"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            {/* Replace Document Trigger */}
                            <button
                              onClick={() => {
                                setReplacingDocId(doc.id);
                                replaceFileInputRef.current?.click();
                              }}
                              className="p-1.5 rounded-lg bg-[#F4F4F6] hover:bg-[#D2D2D4] border border-[#D2D2D4] text-[#000000] transition-colors"
                              title="Replace Certificate File"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete Document */}
                            <button
                              onClick={() => handleDeleteDoc(doc.id)}
                              className="p-1.5 rounded-lg bg-[#F4F4F6] hover:bg-[#D2D2D4] border border-[#D2D2D4] text-[#000000]/60 hover:text-[#FF634A] transition-colors"
                              title="Delete Certificate"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Hidden file input for Replace */}
              <input
                ref={replaceFileInputRef}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                className="hidden"
                onChange={(e) => handleFileUpload(e.target.files)}
                disabled={uploading}
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SCHEME READINESS AUDIT (Preserved & Enhanced) */}
      {activeTab === 'SCHEME_AUDIT' && (
        <div className="space-y-4">
          <div className="bg-[#E7E7E7] rounded-xl border border-[#D2D2D4] p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-[#D2D2D4]">
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-[#000000]">
                  Scheme Document Readiness Audit
                </h2>
                <p className="text-[11px] text-[#000000]/60">
                  Select a government scheme to verify whether your documents satisfy required checklist items.
                </p>
              </div>

              {/* Scheme Picker */}
              <select
                value={selectedOppId || ''}
                onChange={(e) => {
                  const id = Number(e.target.value);
                  setSelectedOppId(id);
                  runReadinessCheck(id);
                }}
                className="px-2.5 py-1.5 text-xs bg-[#FFFFFF] border border-[#D2D2D4] rounded-md text-[#000000] focus:border-[#FF634A] focus:outline-none max-w-xs"
              >
                {opportunities.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Readiness Score Progress Bar */}
            {readinessReport && (
              <div className="bg-[#FFFFFF] p-4 rounded-lg border border-[#D2D2D4] mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-[#000000]">
                    Document Readiness for {readinessReport.opportunity_title}
                  </span>
                  <span className="text-sm font-black text-[#FF634A]">
                    {readinessReport.readiness_percentage}% Ready
                  </span>
                </div>

                <div className="w-full bg-[#E7E7E7] h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-[#FF634A] h-full transition-all duration-500 rounded-full"
                    style={{ width: `${readinessReport.readiness_percentage}%` }}
                  />
                </div>

                <p className="text-[11px] text-[#000000]/70 mt-2 font-medium">
                  {readinessReport.guidance_message || readinessReport.overall_message}
                </p>
              </div>
            )}

            {/* Missing Documents Alert */}
            {readinessReport?.missing_documents && readinessReport.missing_documents.length > 0 && (
              <div className="p-3 bg-[#FFFFFF] rounded-lg border border-[#FF634A] mb-4 space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#FF634A]">
                  <AlertCircle className="w-4 h-4" />
                  <span>Action Required: {readinessReport.missing_documents.length} Missing Certificates</span>
                </div>
                <div className="divide-y divide-[#D2D2D4] text-xs">
                  {readinessReport.missing_documents.map((item: any, idx: number) => (
                    <div key={idx} className="py-2 flex items-start justify-between gap-2">
                      <div>
                        <p className="font-bold text-[#000000]">{item.requirement}</p>
                        <p className="text-[11px] text-[#000000]/60">{item.action || item.guidance}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedDocType(item.document_type || 'INCOME_CERTIFICATE');
                          setIsCameraModalOpen(true);
                        }}
                        className="px-2 py-1 rounded bg-[#E7E7E7] hover:bg-[#D2D2D4] text-[10px] font-bold text-[#000000] whitespace-nowrap flex items-center gap-1"
                      >
                        <Camera className="w-3 h-3 text-[#FF634A]" /> Scan
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Fulfilled Documents */}
            {readinessReport?.fulfilled_documents && readinessReport.fulfilled_documents.length > 0 && (
              <div className="p-3 bg-[#FFFFFF] rounded-lg border border-[#D2D2D4] space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#000000]">
                  <CheckCircle2 className="w-4 h-4 text-[#FF634A]" />
                  <span>Verified &amp; Available Documents ({readinessReport.fulfilled_documents.length})</span>
                </div>
                <div className="divide-y divide-[#D2D2D4] text-xs">
                  {readinessReport.fulfilled_documents.map((item: any, idx: number) => (
                    <div key={idx} className="py-2 flex items-center justify-between">
                      <div>
                        <p className="font-bold text-[#000000]">{item.requirement}</p>
                        <p className="text-[10px] text-[#000000]/60">
                          Matched: {item.filename || item.matched_document_name} ({item.readability || item.readability_status})
                        </p>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#E7E7E7] text-[#000000] border border-[#D2D2D4]">
                        Ready
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Expired / Renewal Warnings */}
            {readinessReport?.expired_documents && readinessReport.expired_documents.length > 0 && (
              <div className="mt-3 p-3 bg-[#FFFFFF] rounded-lg border border-[#FF634A]/50 space-y-1 text-xs">
                <p className="font-bold text-[#FF634A]">Documents Requiring Renewal:</p>
                {readinessReport.expired_documents.map((item: any, idx: number) => (
                  <p key={idx} className="text-[11px] text-[#000000]/70">
                    • <strong>{item.filename || item.document_name}</strong> appears to have expired on {item.expiry_date}. Please obtain an updated certificate for the current session.
                  </p>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 1: MANDATORY PROFILE UPDATES REVIEW (USER CONSENT ENFORCEMENT)
         ========================================================================= */}
      {isProposalModalOpen && activeDocForProposals && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-[#E7E7E7] rounded-xl border border-[#D2D2D4] shadow-none overflow-hidden max-h-[90vh] flex flex-col text-[#000000]">
            {/* Modal Header */}
            <div className="p-4 bg-[#FFFFFF] border-b border-[#D2D2D4] flex items-center justify-between">
              <div>
                <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-[#000000] text-[#FFFFFF]">
                  Mandatory Verification Step
                </span>
                <h3 className="text-sm font-bold text-[#000000] mt-1">
                  Review Proposed Profile Updates from Certificate
                </h3>
              </div>
              <button
                onClick={() => setIsProposalModalOpen(false)}
                className="p-1 rounded text-[#000000]/50 hover:text-[#000000] hover:bg-[#E7E7E7]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              <div className="bg-[#FFFFFF] p-3 rounded-lg border border-[#D2D2D4] text-xs">
                <p className="text-[11px] text-[#000000]/60">Source Document:</p>
                <p className="font-bold text-[#000000]">{activeDocForProposals.document_type_display} ({activeDocForProposals.original_filename})</p>
              </div>

              {/* Holder Mismatch Warning */}
              {currentProposals.some((p) => p.holder_mismatch_warning) && (
                <div className="p-3 bg-[#FFFFFF] rounded-lg border border-[#FF634A] text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-[#FF634A]">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Certificate Holder Name Mismatch</span>
                  </div>
                  <p className="text-[11px] text-[#000000]/70">
                    The name on this certificate appears to differ from your registered account name. If this certificate belongs to a family member, please do not apply these changes to your own profile; link it to their family member profile instead.
                  </p>
                </div>
              )}

              <p className="text-xs text-[#000000]/80">
                Would you like to update your personal profile using the verified information extracted from this document?
              </p>

              {/* Proposals List */}
              {currentProposals.length === 0 ? (
                <p className="text-xs text-[#000000]/60 text-center py-6">
                  All extracted fields match your existing profile or have already been reviewed.
                </p>
              ) : (
                <div className="space-y-3">
                  {currentProposals.map((prop) => {
                    const isPending = prop.status === 'PENDING';
                    const isAccepted = prop.status === 'ACCEPTED';
                    const isRejected = prop.status === 'REJECTED';

                    return (
                      <div
                        key={prop.id}
                        className="bg-[#FFFFFF] rounded-lg border border-[#D2D2D4] p-3 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[#000000]">
                            {prop.field_label}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-[#000000]/50 font-medium">
                              OCR Confidence: {Math.round(prop.ocr_confidence * 100)}%
                            </span>
                            <span
                              className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                                isAccepted
                                  ? 'bg-[#E7E7E7] text-[#000000] border border-[#D2D2D4]'
                                  : isRejected
                                  ? 'bg-[#000000] text-[#FFFFFF]'
                                  : 'bg-[#FF634A] text-[#FFFFFF]'
                              }`}
                            >
                              {prop.status_display}
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs bg-[#F4F4F6] p-2.5 rounded border border-[#D2D2D4]">
                          <div>
                            <span className="text-[10px] text-[#000000]/60 block font-bold">Current Profile Value</span>
                            <span className="text-[#000000] font-medium">{prop.current_value || 'Not provided'}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-[#FF634A] block font-bold">Newly Extracted Value</span>
                            <span className="text-[#000000] font-bold">{prop.extracted_value}</span>
                          </div>
                        </div>

                        {/* Individual Approval Controls */}
                        {isPending && (
                          <div className="flex items-center justify-end gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => handleProposalDecision(prop.id, 'REJECTED')}
                              disabled={decidingProposal}
                              className="px-2.5 py-1 rounded bg-[#E7E7E7] hover:bg-[#D2D2D4] border border-[#D2D2D4] text-[11px] font-bold text-[#000000] transition-colors"
                            >
                              Reject Update
                            </button>
                            <button
                              type="button"
                              onClick={() => handleProposalDecision(prop.id, 'ACCEPTED')}
                              disabled={decidingProposal}
                              className="px-2.5 py-1 rounded bg-[#FF634A] hover:bg-[#E5533D] text-[11px] font-bold text-[#FFFFFF] transition-colors"
                            >
                              Accept Update
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer Batch Actions */}
            <div className="p-4 bg-[#FFFFFF] border-t border-[#D2D2D4] flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setIsProposalModalOpen(false)}
                className="px-3 py-1.5 rounded-lg bg-[#E7E7E7] hover:bg-[#D2D2D4] border border-[#D2D2D4] text-xs font-bold text-[#000000] transition-colors"
              >
                Review Later
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleBatchProposalAction('REJECT_ALL')}
                  disabled={decidingProposal || currentProposals.every((p) => p.status !== 'PENDING')}
                  className="px-3 py-1.5 rounded-lg bg-[#E7E7E7] hover:bg-[#D2D2D4] border border-[#D2D2D4] text-xs font-bold text-[#000000] transition-colors disabled:opacity-50"
                >
                  Reject All
                </button>
                <button
                  type="button"
                  onClick={() => handleBatchProposalAction('ACCEPT_ALL')}
                  disabled={decidingProposal || currentProposals.every((p) => p.status !== 'PENDING')}
                  className="px-3.5 py-1.5 rounded-lg bg-[#FF634A] hover:bg-[#E5533D] text-xs font-bold text-[#FFFFFF] transition-colors disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" /> Accept All Proposed Updates
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 2: RENEWAL GUIDANCE MODAL
         ========================================================================= */}
      {isRenewalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-xl bg-[#E7E7E7] rounded-xl border border-[#D2D2D4] shadow-none overflow-hidden max-h-[90vh] flex flex-col text-[#000000]">
            <div className="p-4 bg-[#FFFFFF] border-b border-[#D2D2D4] flex items-center justify-between">
              <div>
                <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-[#FF634A] text-[#FFFFFF]">
                  Official Renewal Guidance
                </span>
                <h3 className="text-sm font-bold text-[#000000] mt-1">
                  Certificate Renewal Procedure &amp; Checklist
                </h3>
              </div>
              <button
                onClick={() => setIsRenewalModalOpen(false)}
                className="p-1 rounded text-[#000000]/50 hover:text-[#000000] hover:bg-[#E7E7E7]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              {loadingRenewal || !renewalGuidance ? (
                <div className="py-12 text-center text-xs text-[#000000]/60 flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-[#FF634A]" />
                  <span>Loading official renewal guidance...</span>
                </div>
              ) : (
                <>
                  <div className="bg-[#FFFFFF] p-3.5 rounded-lg border border-[#D2D2D4] space-y-1 text-xs">
                    <p className="font-bold text-[#000000]">{renewalGuidance.document_type} ({renewalGuidance.document_name})</p>
                    <p className="text-[11px] text-[#000000]/70">
                      Status: <strong>{renewalGuidance.validity_status}</strong> • Expiry Date: <strong>{renewalGuidance.expiry_date}</strong>
                    </p>
                    <p className="text-[11px] text-[#000000]/70">
                      Official Portal: <a href={renewalGuidance.portal_url} target="_blank" rel="noopener noreferrer" className="text-[#FF634A] underline font-bold inline-flex items-center gap-1">
                        {renewalGuidance.portal_name} <ExternalLink className="w-3 h-3" />
                      </a>
                    </p>
                    <p className="text-[10px] text-[#000000]/50">Competent Authority: {renewalGuidance.authority}</p>
                  </div>

                  {/* Required Supporting Documents Checklist */}
                  <div className="bg-[#FFFFFF] p-3.5 rounded-lg border border-[#D2D2D4] space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#000000]">
                      Required Documents for Renewal
                    </h4>
                    <ul className="space-y-1.5 text-xs">
                      {renewalGuidance.required_documents.map((doc, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <Check className="w-3.5 h-3.5 text-[#FF634A] flex-shrink-0 mt-0.5" />
                          <span>{doc}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Step by step procedure */}
                  <div className="bg-[#FFFFFF] p-3.5 rounded-lg border border-[#D2D2D4] space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#000000]">
                      Step-by-Step Procedure
                    </h4>
                    <ol className="space-y-1.5 text-xs list-decimal list-inside text-[#000000]/80">
                      {renewalGuidance.procedure.map((step, idx) => (
                        <li key={idx} className="leading-relaxed">
                          {step}
                        </li>
                      ))}
                    </ol>
                  </div>

                  <p className="text-[10px] text-[#000000]/50 italic">
                    {renewalGuidance.disclaimer}
                  </p>
                </>
              )}
            </div>

            <div className="p-4 bg-[#FFFFFF] border-t border-[#D2D2D4] flex items-center justify-between">
              <button
                type="button"
                onClick={() => setIsRenewalModalOpen(false)}
                className="px-3 py-1.5 rounded-lg bg-[#E7E7E7] hover:bg-[#D2D2D4] border border-[#D2D2D4] text-xs font-bold text-[#000000] transition-colors"
              >
                Close
              </button>

              {renewalGuidance && (
                <button
                  type="button"
                  onClick={() => {
                    offlineService.downloadChecklistFile(
                      renewalGuidance.document_type,
                      renewalGuidance.procedure,
                      renewalGuidance.required_documents
                    );
                  }}
                  className="px-3.5 py-1.5 rounded-lg bg-[#FF634A] hover:bg-[#E5533D] text-xs font-bold text-[#FFFFFF] transition-colors flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" /> Download Printable Checklist (.txt)
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 3: EDIT EXTRACTED INFORMATION MODAL
         ========================================================================= */}
      {isEditModalOpen && editingDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-[#E7E7E7] rounded-xl border border-[#D2D2D4] shadow-none overflow-hidden max-h-[90vh] flex flex-col text-[#000000]">
            <div className="p-4 bg-[#FFFFFF] border-b border-[#D2D2D4] flex items-center justify-between">
              <div>
                <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-[#000000] text-[#FFFFFF]">
                  Correction Mode
                </span>
                <h3 className="text-sm font-bold text-[#000000] mt-1">
                  Edit Extracted Certificate Details
                </h3>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 rounded text-[#000000]/50 hover:text-[#000000] hover:bg-[#E7E7E7]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-3 flex-1">
              <div>
                <label className="block text-[11px] font-bold text-[#000000] mb-1">Certificate Holder Name</label>
                <input
                  type="text"
                  value={editFormData.holder_name}
                  onChange={(e) => setEditFormData({ ...editFormData, holder_name: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs bg-[#FFFFFF] border border-[#D2D2D4] rounded-md text-[#000000] focus:border-[#FF634A] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#000000] mb-1">Certificate Number</label>
                <input
                  type="text"
                  value={editFormData.certificate_number}
                  onChange={(e) => setEditFormData({ ...editFormData, certificate_number: e.target.value })}
                  placeholder="e.g. RD0039482910"
                  className="w-full px-2.5 py-1.5 text-xs bg-[#FFFFFF] border border-[#D2D2D4] rounded-md text-[#000000] focus:border-[#FF634A] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#000000] mb-1">Issue Date</label>
                  <input
                    type="date"
                    value={editFormData.issue_date}
                    onChange={(e) => setEditFormData({ ...editFormData, issue_date: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-xs bg-[#FFFFFF] border border-[#D2D2D4] rounded-md text-[#000000] focus:border-[#FF634A] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#000000] mb-1">Expiry Date</label>
                  <input
                    type="date"
                    value={editFormData.expiry_date}
                    onChange={(e) => setEditFormData({ ...editFormData, expiry_date: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-xs bg-[#FFFFFF] border border-[#D2D2D4] rounded-md text-[#000000] focus:border-[#FF634A] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#000000] mb-1">State / UT</label>
                  <input
                    type="text"
                    value={editFormData.state}
                    onChange={(e) => setEditFormData({ ...editFormData, state: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-xs bg-[#FFFFFF] border border-[#D2D2D4] rounded-md text-[#000000] focus:border-[#FF634A] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#000000] mb-1">District</label>
                  <input
                    type="text"
                    value={editFormData.district}
                    onChange={(e) => setEditFormData({ ...editFormData, district: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-xs bg-[#FFFFFF] border border-[#D2D2D4] rounded-md text-[#000000] focus:border-[#FF634A] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#000000] mb-1">Issuing Authority</label>
                <input
                  type="text"
                  value={editFormData.issuing_authority}
                  onChange={(e) => setEditFormData({ ...editFormData, issuing_authority: e.target.value })}
                  placeholder="e.g. Tahasildar / Revenue Department"
                  className="w-full px-2.5 py-1.5 text-xs bg-[#FFFFFF] border border-[#D2D2D4] rounded-md text-[#000000] focus:border-[#FF634A] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#000000] mb-1">Annual Family Income (INR)</label>
                <input
                  type="number"
                  value={editFormData.annual_income}
                  onChange={(e) => setEditFormData({ ...editFormData, annual_income: e.target.value })}
                  placeholder="e.g. 120000"
                  className="w-full px-2.5 py-1.5 text-xs bg-[#FFFFFF] border border-[#D2D2D4] rounded-md text-[#000000] focus:border-[#FF634A] focus:outline-none"
                />
              </div>
            </div>

            <div className="p-4 bg-[#FFFFFF] border-t border-[#D2D2D4] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="px-3 py-1.5 rounded-lg bg-[#E7E7E7] hover:bg-[#D2D2D4] border border-[#D2D2D4] text-xs font-bold text-[#000000] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={savingEdit}
                className="px-3.5 py-1.5 rounded-lg bg-[#FF634A] hover:bg-[#E5533D] text-xs font-bold text-[#FFFFFF] transition-colors disabled:opacity-50"
              >
                {savingEdit ? 'Saving & Re-evaluating...' : 'Save & Re-evaluate Validity'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Live Camera Capture Modal */}
      <CameraCaptureModal
        isOpen={isCameraModalOpen}
        onClose={() => setIsCameraModalOpen(false)}
        onCaptureComplete={handleCameraCaptureComplete}
        documentCategory={selectedDocType}
        title={`Scan ${selectedDocType.replace(/_/g, ' ')}`}
      />
    </div>
  );
};
