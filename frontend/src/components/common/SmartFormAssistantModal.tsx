import React, { useState } from 'react';
import {
  X, HelpCircle, AlertTriangle, ListChecks,
  UserCheck, ShieldCheck, RefreshCw
} from 'lucide-react';
import { aiAssistantService } from '../../services/scholarsetuService';
import { useAuth } from '../../context/AuthContext';

interface SmartFormAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  opportunityTitle?: string;
}

export const SmartFormAssistantModal: React.FC<SmartFormAssistantModalProps> = ({
  isOpen,
  onClose,
  opportunityTitle = 'National Post-Matric Scholarship',
}) => {
  const { profile } = useAuth();
  const [fieldName, setFieldName] = useState('Income Certificate Number and Gross Annual Family Income');
  const [loading, setLoading] = useState(false);
  const [assistantResponse, setAssistantResponse] = useState<any>(null);

  if (!isOpen) return null;

  const commonQuestions = [
    'Gross Annual Family Income vs Net Income',
    'Hosteller vs Day Scholar Verification',
    'Income Certificate Number & Competent Authority',
    'Aadhaar Seeding and DBT Active Bank Account',
    'Bonafide Student Certificate format',
  ];

  const handleAskAssistant = async (queryField?: string) => {
    const targetField = queryField || fieldName;
    if (!targetField.trim()) return;

    setLoading(true);
    setAssistantResponse(null);

    try {
      const res = await aiAssistantService.formAssistant({
        opportunity_name: opportunityTitle,
        field_name: targetField,
        user_profile_context: profile || {},
      });
      setAssistantResponse(res);
    } catch (err) {
      console.error(err);
      setAssistantResponse({
        field_explanation:
          'Ensure the value matches official government certificates. Name and father\'s name must exactly match your 10th marksheet and Aadhaar.',
        suggested_value: 'Refer to your DigiLocker documents or profile records.',
        potential_inconsistencies: [
          'Expired income certificate (must be issued for current FY).',
          'Bank account not seeded with Aadhaar for Direct Benefit Transfer (DBT).',
        ],
        checklist: [
          'Verify certificate barcode and digital signature.',
          'Double check IFSC code and active account status.',
        ],
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#000000]/60 backdrop-blur-sm">
      <div className="bg-[#F4F4F6] rounded-xl max-w-xl w-full max-h-[90vh] overflow-y-auto border border-[#D2D2D4] shadow-2xl text-[#000000]">
        {/* Header */}
        <div className="p-5 border-b border-[#D2D2D4] flex items-center justify-between bg-[#E7E7E7]">
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-bold text-[#000000]">
                Smart Application Form Assistant
              </h3>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#000000] text-[#FFFFFF]">
                AI ASSIST
              </span>
            </div>
            <p className="text-[11px] text-[#000000]/60 mt-0.5">
              Field guidance for <span className="font-semibold text-[#000000]">{opportunityTitle}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-[#000000]/60 hover:text-[#000000] hover:bg-[#D2D2D4]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#000000] mb-1.5">
              Form field you need assistance with:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={fieldName}
                onChange={(e) => setFieldName(e.target.value)}
                placeholder="e.g. Annual family income, Bonafide certificate..."
                className="flex-1 px-3 py-2 text-xs bg-[#FFFFFF] border border-[#D2D2D4] rounded-md focus:border-[#FF634A] focus:outline-none"
              />
              <button
                onClick={() => handleAskAssistant()}
                disabled={loading || !fieldName.trim()}
                className="px-3.5 py-2 bg-[#FF634A] hover:bg-[#E5533D] disabled:opacity-50 text-[#FFFFFF] font-bold text-xs rounded-md transition-colors flex items-center gap-1"
              >
                {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'Explain'}
              </button>
            </div>

            {/* Quick Suggestions */}
            <div className="flex flex-wrap gap-1 mt-2">
              {commonQuestions.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setFieldName(q);
                    handleAskAssistant(q);
                  }}
                  className="px-2 py-0.5 text-[10px] font-semibold bg-[#E7E7E7] hover:border-[#000000] text-[#000000] rounded border border-[#D2D2D4] transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          {assistantResponse && (
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-[#E7E7E7] border border-[#D2D2D4] space-y-1">
                <span className="text-[10px] font-bold uppercase text-[#000000]/60 flex items-center gap-1">
                  <HelpCircle className="w-3.5 h-3.5 text-[#FF634A]" /> Field Meaning:
                </span>
                <p className="text-xs text-[#000000] leading-relaxed">
                  {assistantResponse.field_explanation}
                </p>
              </div>

              {assistantResponse.suggested_value && (
                <div className="p-3 rounded-lg bg-[#E7E7E7] border border-[#D2D2D4] space-y-1">
                  <span className="text-[10px] font-bold uppercase text-[#000000]/60 flex items-center gap-1">
                    <UserCheck className="w-3.5 h-3.5 text-[#FF634A]" /> Suggested Value From Profile:
                  </span>
                  <p className="text-xs font-mono font-bold text-[#000000] bg-[#FFFFFF] p-2 rounded border border-[#D2D2D4]">
                    {assistantResponse.suggested_value}
                  </p>
                </div>
              )}

              {assistantResponse.potential_inconsistencies && assistantResponse.potential_inconsistencies.length > 0 && (
                <div className="p-3 rounded-lg bg-[#E7E7E7] border border-[#FF634A]/50 space-y-1">
                  <span className="text-[10px] font-bold uppercase text-[#FF634A] flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" /> Common Portal Errors:
                  </span>
                  <ul className="text-xs text-[#000000] space-y-0.5 list-disc list-inside">
                    {assistantResponse.potential_inconsistencies.map((w: string, idx: number) => (
                      <li key={idx}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}

              {assistantResponse.checklist && assistantResponse.checklist.length > 0 && (
                <div className="p-3 rounded-lg bg-[#FFFFFF] border border-[#D2D2D4] space-y-1.5">
                  <span className="text-[10px] font-bold uppercase text-[#000000]/60 flex items-center gap-1">
                    <ListChecks className="w-3.5 h-3.5 text-[#FF634A]" /> Submission Checklist:
                  </span>
                  <div className="space-y-1">
                    {assistantResponse.checklist.map((item: string, idx: number) => (
                      <label key={idx} className="flex items-center gap-2 text-xs text-[#000000] cursor-pointer">
                        <input type="checkbox" className="rounded text-[#FF634A] focus:ring-[#FF634A]" />
                        <span>{item}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#D2D2D4] bg-[#E7E7E7] flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-md bg-[#000000] text-[#FFFFFF] font-bold text-xs hover:bg-[#FF634A] transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
