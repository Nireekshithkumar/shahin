import React, { useState, useRef } from 'react';
import {
  Upload, AlertCircle, RefreshCw, FileText,
  ShieldAlert, Camera, Image as ImageIcon, CheckCircle2,
  ListChecks, Scale
} from 'lucide-react';
import { aiAssistantService } from '../services/scholarsetuService';
import { CameraCaptureModal } from '../components/common/CameraCaptureModal';

export const RejectionAnalyzerPage: React.FC = () => {
  const [rejectionText, setRejectionText] = useState('');
  const [rejectionFiles, setRejectionFiles] = useState<File[]>([]);
  const [analysis, setAnalysis] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Camera modal state
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);

  // Hidden file inputs
  const deviceFileInputRef = useRef<HTMLInputElement | null>(null);
  const galleryFileInputRef = useRef<HTMLInputElement | null>(null);

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

  const handleFilesSelected = (files: FileList | File[] | null) => {
    if (!files || files.length === 0) return;
    const fileList = Array.from(files);
    setRejectionFiles(fileList);
  };

  const handleCameraCaptureComplete = (capturedFiles: File[]) => {
    if (capturedFiles.length === 0) return;
    setRejectionFiles(capturedFiles);
  };

  const handleAnalyze = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!rejectionText && rejectionFiles.length === 0) {
      setError('Please provide rejection remarks, upload a notice file, or capture the document with your camera.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await aiAssistantService.analyzeRejection(
        rejectionText,
        rejectionFiles.length > 0 ? rejectionFiles : undefined
      );
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
          Feature 5: Grievance &amp; Error Diagnosis
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-[#000000]">
          AI Rejection Reason Analyzer
        </h1>
        <p className="text-xs text-[#000000]/60 mt-1">
          Scan rejection notices via device file, live camera capture, or gallery to decipher administrative error codes, clarify rejection grounds, and discover official appeal remedies.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Input Form */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-[#E7E7E7] rounded-xl border border-[#D2D2D4] p-5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#000000] mb-3 flex items-center gap-1.5">
              <Upload className="w-4 h-4 text-[#FF634A]" />
              Acquire Rejection Letter or Slip
            </h2>

            {/* Three Mandatory Acquisition Methods */}
            <div className="space-y-2 mb-3">
              {/* 1. Upload from Device */}
              <input
                ref={deviceFileInputRef}
                type="file"
                id="rej-upload"
                accept=".pdf,.png,.jpg,.jpeg"
                multiple
                className="hidden"
                onChange={(e) => handleFilesSelected(e.target.files)}
              />
              <button
                type="button"
                onClick={() => deviceFileInputRef.current?.click()}
                className="w-full p-2.5 rounded-lg bg-[#FFFFFF] border border-[#D2D2D4] hover:border-[#000000] flex items-center justify-between text-left transition-colors group"
              >
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[#F4F4F6] border border-[#D2D2D4] flex items-center justify-center text-[#FF634A]">
                    <FileText className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#000000]">Upload from Device</p>
                    <p className="text-[10px] text-[#000000]/60">Select PDF, JPG, or PNG</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-[#FF634A] group-hover:underline">Browse</span>
              </button>

              {/* 2. Capture with Camera */}
              <button
                type="button"
                onClick={() => setIsCameraModalOpen(true)}
                className="w-full p-2.5 rounded-lg bg-[#FFFFFF] border border-[#FF634A]/60 hover:border-[#FF634A] flex items-center justify-between text-left transition-colors group"
              >
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[#FF634A] text-white flex items-center justify-center">
                    <Camera className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#000000]">Capture Notice with Camera</p>
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
                onChange={(e) => handleFilesSelected(e.target.files)}
              />
              <button
                type="button"
                onClick={() => galleryFileInputRef.current?.click()}
                className="w-full p-2.5 rounded-lg bg-[#FFFFFF] border border-[#D2D2D4] hover:border-[#000000] flex items-center justify-between text-left transition-colors group"
              >
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[#F4F4F6] border border-[#D2D2D4] flex items-center justify-center text-[#000000]">
                    <ImageIcon className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#000000]">Choose from Gallery</p>
                    <p className="text-[10px] text-[#000000]/60">Select saved photo or screenshot</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-[#000000]/70 group-hover:underline">Gallery</span>
              </button>
            </div>

            {/* Selected File Badge */}
            {rejectionFiles.length > 0 && (
              <div className="p-2.5 bg-[#FFFFFF] rounded-lg border border-[#D2D2D4] flex items-center justify-between mb-3 text-xs">
                <div className="flex items-center gap-2 truncate">
                  <FileText className="w-4 h-4 text-[#FF634A] flex-shrink-0" />
                  <span className="truncate font-semibold">
                    {rejectionFiles.length === 1
                      ? rejectionFiles[0].name
                      : `${rejectionFiles.length} pages captured`}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setRejectionFiles([])}
                  className="text-[10px] text-[#FF634A] font-bold hover:underline"
                >
                  Clear
                </button>
              </div>
            )}

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
              disabled={loading || (!rejectionText && rejectionFiles.length === 0)}
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
                    setRejectionFiles([]);
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

              {/* Identified Root Cause */}
              {analysis.rejection_cause && (
                <div className="p-3 bg-[#FFFFFF] rounded-lg border border-[#FF634A]/40 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-[#FF634A] flex-shrink-0" />
                  <div>
                    <span className="text-[10px] font-bold uppercase text-[#000000]/50 block">Identified Root Cause</span>
                    <p className="text-xs font-bold text-[#000000]">{analysis.rejection_cause}</p>
                  </div>
                </div>
              )}

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
              {(analysis.suggested_corrective_actions || analysis.corrective_actions) && (
                <div className="p-3.5 bg-[#FFFFFF] rounded-lg border border-[#D2D2D4]">
                  <span className="text-[10px] font-bold uppercase text-[#000000]/50 block mb-2 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#FF634A]" />
                    Required Corrective Actions:
                  </span>
                  <ul className="space-y-1.5 text-xs text-[#000000] list-disc list-inside">
                    {(analysis.suggested_corrective_actions || analysis.corrective_actions).map((act: string, aIdx: number) => (
                      <li key={aIdx}>{act}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Appeal Paths / Guidance */}
              {(analysis.official_appeal_guidance || analysis.appeal_paths) && (
                <div className="p-3.5 bg-[#FFFFFF] rounded-lg border border-[#D2D2D4]">
                  <span className="text-[10px] font-bold uppercase text-[#000000]/50 block mb-2 flex items-center gap-1.5">
                    <Scale className="w-3.5 h-3.5 text-[#FF634A]" />
                    Official Grievance &amp; Appeal Avenues:
                  </span>
                  {typeof analysis.official_appeal_guidance === 'string' ? (
                    <p className="text-xs text-[#000000] leading-relaxed">{analysis.official_appeal_guidance}</p>
                  ) : (
                    <ul className="space-y-1 text-xs text-[#000000] list-disc list-inside">
                      {analysis.appeal_paths.map((p: string, pIdx: number) => (
                        <li key={pIdx}>{p}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {/* Correction Checklist */}
              {analysis.correction_checklist && analysis.correction_checklist.length > 0 && (
                <div className="p-3.5 bg-[#FFFFFF] rounded-lg border border-[#D2D2D4]">
                  <span className="text-[10px] font-bold uppercase text-[#000000]/50 block mb-2 flex items-center gap-1.5">
                    <ListChecks className="w-3.5 h-3.5 text-[#FF634A]" />
                    Step-by-Step Rectification Checklist:
                  </span>
                  <div className="space-y-1.5 text-xs text-[#000000]">
                    {analysis.correction_checklist.map((item: string, cIdx: number) => (
                      <div key={cIdx} className="p-2 bg-[#F4F4F6] rounded border border-[#D2D2D4]">
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Official Disclaimer */}
              {analysis.official_disclaimer && (
                <p className="text-[10px] text-[#000000]/60 italic pt-1">
                  {analysis.official_disclaimer}
                </p>
              )}
            </div>
          ) : (
            <div className="bg-[#E7E7E7] rounded-xl border border-[#D2D2D4] p-12 text-center">
              <ShieldAlert className="w-10 h-10 text-[#000000]/30 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-[#000000]">No Rejection Notice Scanned</h3>
              <p className="text-xs text-[#000000]/60 max-w-sm mx-auto mt-1">
                Upload a rejection notice from device, capture it with your camera, or paste remarks on the left to diagnose why an application was rejected.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Live Camera Capture Modal */}
      <CameraCaptureModal
        isOpen={isCameraModalOpen}
        onClose={() => setIsCameraModalOpen(false)}
        onCaptureComplete={handleCameraCaptureComplete}
        documentCategory="REJECTION_NOTICE"
        title="Capture Rejection Notice / Slip"
      />
    </div>
  );
};
