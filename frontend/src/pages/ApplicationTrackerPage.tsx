import React, { useState, useEffect } from 'react';
import {
  Kanban, Plus, CheckCircle2, Clock, FileText, ExternalLink,
  Trash2, Edit, AlertCircle, Calendar
} from 'lucide-react';
import { applicationService, opportunityService } from '../services/scholarsetuService';
import { ApplicationTrackerItem, Opportunity } from '../types';
import { useAuth } from '../context/AuthContext';

export const ApplicationTrackerPage: React.FC = () => {
  const { user } = useAuth();
  const [trackers, setTrackers] = useState<ApplicationTrackerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [availableOpps, setAvailableOpps] = useState<Opportunity[]>([]);
  const [selectedOppId, setSelectedOppId] = useState<number | ''>('');
  const [notes, setNotes] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  const statuses = [
    'INTERESTED', 'PLANNING', 'DOCUMENTS_PENDING',
    'READY_TO_APPLY', 'APPLICATION_SUBMITTED', 'APPROVED'
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
        status: 'INTERESTED',
        personal_notes: notes,
      });
      setShowAddModal(false);
      setSelectedOppId('');
      setNotes('');
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
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <Kanban className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-slate-800">Sign in to use Application Tracker</h2>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
          Keep track of your document checklists, submission reference numbers, and deadlines in one place.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Kanban className="w-6 h-6 text-brand-600" />
            My Application Tracker
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Personal organizational board for scholarships you are planning, preparing documents for, or have submitted.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-md shadow-brand-500/20 flex items-center gap-1.5 self-start"
        >
          <Plus className="w-4 h-4" /> Add Opportunity to Track
        </button>
      </div>

      {/* Board */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 rounded-2xl bg-white border border-slate-200 animate-pulse" />
          ))}
        </div>
      ) : trackers.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <Clock className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <h3 className="font-bold text-slate-800 text-sm">No opportunities tracked yet</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
            Browse scholarships and add the ones you plan to apply for to start tracking documents and deadlines.
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 rounded-xl bg-brand-600 text-white font-bold text-xs"
          >
            Add First Opportunity
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {trackers.map((t) => (
            <div
              key={t.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <select
                    value={t.status}
                    onChange={(e) => handleStatusChange(t.id, e.target.value)}
                    className="text-[11px] font-bold px-2 py-1 rounded-lg border border-slate-200 bg-slate-50 text-brand-700 focus:outline-none"
                  >
                    {statuses.map((st) => (
                      <option key={st} value={st}>
                        {st.replace(/_/g, ' ')}
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={() => handleDelete(t.id)}
                    className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <h3 className="font-bold text-slate-900 text-sm mb-1 line-clamp-2">
                  {t.opportunity_details?.title || 'Scholarship Scheme'}
                </h3>
                <p className="text-xs text-slate-500 font-medium mb-3">
                  {t.opportunity_details?.provider}
                </p>

                {t.personal_notes && (
                  <p className="text-xs text-slate-600 italic bg-slate-50 p-2 rounded-lg border border-slate-100 mb-3">
                    "{t.personal_notes}"
                  </p>
                )}

                {/* Documents Checklist preview */}
                {t.documents_checklist && t.documents_checklist.length > 0 && (
                  <div className="mb-3 space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Documents Checklist:</p>
                    {t.documents_checklist.slice(0, 3).map((doc, idx) => (
                      <div key={idx} className="flex items-center gap-1.5 text-xs text-slate-600">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="truncate">{doc.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-[11px] text-slate-400 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {t.opportunity_details?.application_closing_date || 'Ongoing'}
                </span>

                <a
                  href={t.opportunity_details?.official_application_url || 'https://scholarships.gov.in'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-brand-600 hover:underline flex items-center gap-1"
                >
                  Apply Portal <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-3">Add Opportunity to Tracker</h3>
            <form onSubmit={handleAddTracker} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Select Scholarship</label>
                <select
                  value={selectedOppId}
                  onChange={(e) => setSelectedOppId(Number(e.target.value))}
                  required
                  className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-800"
                >
                  <option value="">-- Choose Opportunity --</option>
                  {availableOpps.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.title} ({o.applicable_state})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Personal Application Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Gathered Class 12 marksheet; awaiting income certificate from Tehsildar office."
                  className="w-full p-2.5 border border-slate-200 rounded-lg text-xs"
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3.5 py-2 rounded-xl text-slate-600 font-bold hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!selectedOppId}
                  className="px-4 py-2 rounded-xl bg-brand-600 text-white font-bold hover:bg-brand-700 disabled:opacity-50"
                >
                  Start Tracking
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
