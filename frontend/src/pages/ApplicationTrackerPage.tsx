import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Kanban, Plus, Clock, ExternalLink,
  Trash2, Calendar, IndianRupee, Hash, AlertOctagon, HelpCircle
} from 'lucide-react';
import { applicationService, opportunityService } from '../services/scholarsetuService';
import { ApplicationTrackerItem, Opportunity } from '../types';
import { useAuth } from '../context/AuthContext';
import { SmartFormAssistantModal } from '../components/common/SmartFormAssistantModal';

export const ApplicationTrackerPage: React.FC = () => {
  const { user } = useAuth();
  const [trackers, setTrackers] = useState<ApplicationTrackerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [availableOpps, setAvailableOpps] = useState<Opportunity[]>([]);
  const [selectedOppId, setSelectedOppId] = useState<number | ''>('');
  const [notes, setNotes] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [expectedBenefit, setExpectedBenefit] = useState('');
  const [applicationDate, setApplicationDate] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  const [activeFormAssistantScheme, setActiveFormAssistantScheme] = useState<string | null>(null);

  const ALL_STATUSES = [
    { key: 'NOT_APPLIED', label: 'Not Applied' },
    { key: 'APPLIED', label: 'Applied' },
    { key: 'SUBMITTED', label: 'Submitted' },
    { key: 'DOCUMENTS_UNDER_VERIFICATION', label: 'Under Verification' },
    { key: 'PENDING_APPROVAL', label: 'Pending Approval' },
    { key: 'APPROVED', label: 'Approved' },
    { key: 'REJECTED', label: 'Rejected' },
    { key: 'BENEFIT_RECEIVED', label: 'Benefit Received' },
    { key: 'CLOSED', label: 'Closed' },
  ];

  const fetchTrackers = async () => {
    setLoading(true);
    try {
      if (user) {
        const data = await applicationService.getTrackers();
        setTrackers(data);
      }
      const oppsRes = await opportunityService.getOpportunities();
      setAvailableOpps(oppsRes.results || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrackers();
  }, [user]);

  const handleAddTracker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOppId) return;

    try {
      await applicationService.createTracker({
        opportunity: Number(selectedOppId),
        status: 'NOT_APPLIED',
        personal_notes: notes,
        reference_number: referenceNumber,
        expected_benefit: expectedBenefit ? parseFloat(expectedBenefit) : null,
        application_date: applicationDate || null,
      });
      setShowAddModal(false);
      setSelectedOppId('');
      setNotes('');
      setReferenceNumber('');
      setExpectedBenefit('');
      setApplicationDate('');
      fetchTrackers();
    } catch (err) {
      console.error(err);
    }
  };

  const handleStatusChange = async (id: number, newStatus: string) => {
    try {
      await applicationService.updateTracker(id, { status: newStatus });
      fetchTrackers();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('Remove this application tracker?')) {
      try {
        await applicationService.deleteTracker(id);
        fetchTrackers();
      } catch (err) {
        console.error(err);
      }
    }
  };

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center text-[#000000]">
        <Kanban className="w-10 h-10 text-[#000000]/30 mx-auto mb-3" />
        <h2 className="text-base font-bold text-[#000000]">Sign in to use Application Tracker</h2>
        <p className="text-xs text-[#000000]/60 mt-1 max-w-sm mx-auto">
          Keep track of your document checklists, submission reference numbers, and deadlines in one place.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-[#000000]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-[#D2D2D4]">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#000000]">
            Application Progress Tracker
          </h1>
          <p className="text-xs text-[#000000]/60 mt-1">
            Monitor and track your government scheme milestones across all 9 verification stages.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 rounded-lg bg-[#FF634A] hover:bg-[#E5533D] text-[#FFFFFF] font-bold text-xs transition-colors flex items-center gap-1.5 self-start"
        >
          <Plus className="w-4 h-4" /> Add Application
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-44 bg-[#E7E7E7] rounded-xl animate-pulse" />
          ))}
        </div>
      ) : trackers.length === 0 ? (
        <div className="text-center py-16 bg-[#E7E7E7] rounded-xl border border-[#D2D2D4] p-8">
          <Clock className="w-10 h-10 text-[#000000]/30 mx-auto mb-3" />
          <h3 className="text-xs font-bold text-[#000000]">No Applications Tracked Yet</h3>
          <p className="text-xs text-[#000000]/60 mt-1 max-w-md mx-auto mb-4">
            Add scholarships or government schemes you are preparing for or have submitted.
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-[#FF634A] hover:bg-[#E5533D] text-[#FFFFFF] text-xs font-bold rounded-lg transition-colors"
          >
            Track First Scheme
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {trackers.map((tracker) => {
            const opp = tracker.opportunity_details || tracker.opportunity_detail || availableOpps.find((o) => o.id === tracker.opportunity);
            const isRejected = tracker.status === 'REJECTED';
            const isApproved = tracker.status === 'APPROVED' || tracker.status === 'BENEFIT_RECEIVED';

            return (
              <div
                key={tracker.id}
                className="bg-[#E7E7E7] rounded-xl border border-[#D2D2D4] p-5 flex flex-col justify-between hover:border-[#000000] transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        isApproved
                          ? 'bg-[#000000] text-[#FFFFFF] border-[#000000]'
                          : isRejected
                          ? 'bg-[#FF634A] text-[#FFFFFF] border-[#FF634A]'
                          : 'bg-[#FFFFFF] text-[#000000] border-[#D2D2D4]'
                      }`}
                    >
                      {tracker.status.replace(/_/g, ' ')}
                    </span>

                    <button
                      onClick={() => handleDelete(tracker.id)}
                      className="text-[#000000]/40 hover:text-[#FF634A] p-1 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <h3 className="text-xs font-bold text-[#000000] line-clamp-2 mb-1">
                    {opp?.title || `Opportunity #${tracker.opportunity}`}
                  </h3>
                  <p className="text-[10px] text-[#000000]/60 mb-3 truncate">
                    {opp?.provider || 'Government Department'}
                  </p>

                  <div className="space-y-1.5 bg-[#FFFFFF] rounded-lg p-3 border border-[#D2D2D4] text-xs mb-3">
                    {tracker.reference_number && (
                      <div className="flex items-center justify-between text-[#000000]">
                        <span className="text-[11px] text-[#000000]/60">Ref ID:</span>
                        <span className="font-mono font-bold text-xs">{tracker.reference_number}</span>
                      </div>
                    )}
                    {tracker.expected_benefit && (
                      <div className="flex items-center justify-between text-[#000000]">
                        <span className="text-[11px] text-[#000000]/60">Expected Benefit:</span>
                        <span className="font-bold text-xs">₹{Number(tracker.expected_benefit).toLocaleString('en-IN')}</span>
                      </div>
                    )}
                    {tracker.application_date && (
                      <div className="flex items-center justify-between text-[#000000]">
                        <span className="text-[11px] text-[#000000]/60">Applied Date:</span>
                        <span className="text-xs">{tracker.application_date}</span>
                      </div>
                    )}
                  </div>

                  {isRejected && (
                    <div className="mb-3 p-3 rounded-lg bg-[#FFFFFF] border border-[#FF634A] space-y-1.5">
                      <p className="text-xs font-bold text-[#FF634A]">Application Marked Rejected</p>
                      <p className="text-[11px] text-[#000000]/70">
                        Analyze rejection reasons to discover corrective actions and appeal deadlines.
                      </p>
                      <Link
                        to={`/rejection-analyzer?scheme=${encodeURIComponent(opp?.title || '')}`}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md bg-[#FF634A] hover:bg-[#E5533D] text-[#FFFFFF] font-bold text-xs transition-colors w-full"
                      >
                        Analyze Rejection with AI
                      </Link>
                    </div>
                  )}

                  <button
                    onClick={() => setActiveFormAssistantScheme(opp?.title || 'Scholarship Form')}
                    className="w-full mb-3 py-1.5 px-3 rounded-md border border-[#D2D2D4] bg-[#FFFFFF] hover:bg-[#D2D2D4] text-[#000000] text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    Form Assistant & Checklist
                  </button>
                </div>

                <div className="pt-3 border-t border-[#D2D2D4] flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold uppercase text-[#000000]/50">Stage:</span>
                  <select
                    value={tracker.status}
                    onChange={(e) => handleStatusChange(tracker.id, e.target.value)}
                    className="text-xs font-bold bg-[#FFFFFF] border border-[#D2D2D4] rounded-md px-2 py-1 text-[#000000] focus:border-[#FF634A] focus:outline-none"
                  >
                    {ALL_STATUSES.map((st) => (
                      <option key={st.key} value={st.key}>
                        {st.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Tracker Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#000000]/60 backdrop-blur-sm">
          <div className="bg-[#F4F4F6] rounded-xl border border-[#D2D2D4] max-w-lg w-full p-6 shadow-2xl">
            <h3 className="text-sm font-bold text-[#000000] mb-1">Add Scheme to Tracker</h3>
            <p className="text-xs text-[#000000]/60 mb-4">Select an opportunity to track its milestone progress.</p>

            <form onSubmit={handleAddTracker} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-[#000000] mb-1">Target Opportunity *</label>
                <select
                  required
                  value={selectedOppId}
                  onChange={(e) => setSelectedOppId(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 text-xs bg-[#FFFFFF] border border-[#D2D2D4] rounded-md focus:border-[#FF634A] focus:outline-none"
                >
                  <option value="">-- Choose opportunity --</option>
                  {availableOpps.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-[#000000] mb-1">Reference Number</label>
                  <input
                    type="text"
                    value={referenceNumber}
                    onChange={(e) => setReferenceNumber(e.target.value)}
                    placeholder="e.g. NSP2026/KA/8372"
                    className="w-full px-2.5 py-1.5 text-xs bg-[#FFFFFF] border border-[#D2D2D4] rounded-md focus:border-[#FF634A] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#000000] mb-1">Expected Benefit (₹)</label>
                  <input
                    type="number"
                    value={expectedBenefit}
                    onChange={(e) => setExpectedBenefit(e.target.value)}
                    placeholder="e.g. 50000"
                    className="w-full px-2.5 py-1.5 text-xs bg-[#FFFFFF] border border-[#D2D2D4] rounded-md focus:border-[#FF634A] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#000000] mb-1">Submission Date</label>
                <input
                  type="date"
                  value={applicationDate}
                  onChange={(e) => setApplicationDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-[#FFFFFF] border border-[#D2D2D4] rounded-md focus:border-[#FF634A] focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#D2D2D4]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 rounded-md text-xs font-semibold text-[#000000]/70 hover:bg-[#E7E7E7]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!selectedOppId}
                  className="px-4 py-1.5 rounded-md bg-[#FF634A] hover:bg-[#E5533D] text-[#FFFFFF] font-bold text-xs disabled:opacity-50"
                >
                  Save Tracker
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Smart Form Assistant Modal */}
      {activeFormAssistantScheme && (
        <SmartFormAssistantModal
          isOpen={!!activeFormAssistantScheme}
          onClose={() => setActiveFormAssistantScheme(null)}
          opportunityTitle={activeFormAssistantScheme}
        />
      )}
    </div>
  );
};
