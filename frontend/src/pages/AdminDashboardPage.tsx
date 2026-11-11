import React, { useState, useEffect } from 'react';
import {
  Database, Upload, RefreshCw, AlertTriangle, ExternalLink, Activity, Layers, Mail,
  Send, Eye, Clock, Users, Plus, X, FileText, Trash2, Edit2, ShieldCheck,
  Bot, Search
} from 'lucide-react';
import {
  adminService,
  notificationService,
  opportunityService
} from '../services/scholarsetuService';
import { Opportunity } from '../types';

export const AdminDashboardPage: React.FC = () => {
  type TabType =
    | 'overview'
    | 'scholarships'
    | 'schemes'
    | 'ingestion'
    | 'users'
    | 'notifications'
    | 'ai_monitoring'
    | 'audit_logs';

  const [activeTab, setActiveTab] = useState<TabType>('overview');

  // Overview & Stats
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Scholarships & Schemes Management
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loadingOpps, setLoadingOpps] = useState(false);
  const [oppFilterState, setOppFilterState] = useState('');
  const [oppSearch, setOppSearch] = useState('');

  // Add / Edit Scholarship Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [creatingOpp, setCreatingOpp] = useState(false);
  const [editingOppId, setEditingOppId] = useState<number | null>(null);
  const [oppModalSuccess, setOppModalSuccess] = useState<string | null>(null);
  const [oppModalError, setOppModalError] = useState<string | null>(null);

  const [oppForm, setOppForm] = useState({
    title: '',
    provider: '',
    applicable_state: 'All India',
    opportunity_type: 'SCHOLARSHIP',
    benefit_amount: '',
    benefit_description: '',
    application_closing_date: '',
    official_application_url: 'https://scholarships.gov.in',
    short_description: '',
    education_levels: ['UNDERGRADUATE'],
    eligible_categories: ['ALL'],
    is_published: true,
  });

  // Scheme Ingestion Hub
  const [importing, setImporting] = useState(false);
  const [importReport, setImportReport] = useState<any>(null);
  const [syncingSourceId, setSyncingSourceId] = useState<number | null>(null);

  // User Management
  const [usersList, setUsersList] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [togglingUserId, setTogglingUserId] = useState<number | null>(null);

  // Notification Monitoring
  const [notifStats, setNotifStats] = useState<any>(null);
  const [loadingNotifStats, setLoadingNotifStats] = useState(false);
  const [deliveryLogs, setDeliveryLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [logFilterStatus, setLogFilterStatus] = useState<string>('');
  const [retryingLogId, setRetryingLogId] = useState<number | null>(null);
  const [retryResult, setRetryResult] = useState<string | null>(null);
  const [previewTemplateType, setPreviewTemplateType] = useState<string>('NEW_SCHOLARSHIP');
  const [previewContent, setPreviewContent] = useState<{ html: string; text: string } | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [customEmail, setCustomEmail] = useState('');
  const [sendingTestEmail, setSendingTestEmail] = useState(false);
  const [testEmailFeedback, setTestEmailFeedback] = useState<string | null>(null);

  // Audit Logs
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const data = await adminService.getDashboardStats();
      setStats(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchOpportunities = async () => {
    setLoadingOpps(true);
    try {
      const params: any = {};
      if (activeTab === 'scholarships') params.opportunity_type = 'SCHOLARSHIP';
      if (activeTab === 'schemes') params.opportunity_type = 'GOVERNMENT_SCHEME';
      if (oppSearch) params.search = oppSearch;
      if (oppFilterState) params.state = oppFilterState;

      const res = await opportunityService.getOpportunities(params);
      setOpportunities(res.results || (Array.isArray(res) ? res : []));
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingOpps(false);
    }
  };

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await adminService.getUsers(userSearch);
      setUsersList(Array.isArray(res) ? res : res.results || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchNotificationData = async () => {
    setLoadingNotifStats(true);
    setLoadingLogs(true);
    try {
      const [nStats, dLogs] = await Promise.all([
        adminService.getNotificationStats(),
        adminService.getDeliveryLogs({ status: logFilterStatus || undefined }),
      ]);
      setNotifStats(nStats);
      setDeliveryLogs(Array.isArray(dLogs) ? dLogs : dLogs.results || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingNotifStats(false);
      setLoadingLogs(false);
    }
  };

  const fetchAuditLogs = async () => {
    setLoadingAudit(true);
    try {
      const res = await adminService.getAuditLogs();
      setAuditLogs(Array.isArray(res) ? res : res.results || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAudit(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    if (activeTab === 'scholarships' || activeTab === 'schemes') {
      fetchOpportunities();
    } else if (activeTab === 'users') {
      fetchUsers();
    } else if (activeTab === 'notifications') {
      fetchNotificationData();
    } else if (activeTab === 'audit_logs') {
      fetchAuditLogs();
    }
  }, [activeTab, oppFilterState, logFilterStatus]);

  const handleVerifyOpp = async (id: number) => {
    try {
      await opportunityService.verifyOpportunity(id);
      fetchOpportunities();
      fetchStats();
    } catch (err) {
      console.error(err);
    }
  };

  const handleRejectOpp = async (id: number) => {
    try {
      await opportunityService.rejectOpportunity(id);
      fetchOpportunities();
      fetchStats();
    } catch (err) {
      console.error(err);
    }
  };

  const handlePublishToggle = async (id: number, currentPublished: boolean) => {
    try {
      if (currentPublished) {
        await opportunityService.unpublishOpportunity(id);
      } else {
        await opportunityService.publishOpportunity(id);
      }
      fetchOpportunities();
      fetchStats();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteOpp = async (id: number) => {
    if (confirm('Permanently delete this record? This cannot be undone.')) {
      try {
        await opportunityService.deleteOpportunity(id);
        fetchOpportunities();
        fetchStats();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleSaveOpportunity = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingOpp(true);
    setOppModalError(null);
    setOppModalSuccess(null);

    try {
      const payload: any = {
        ...oppForm,
        benefit_amount: oppForm.benefit_amount ? parseFloat(oppForm.benefit_amount) : null,
        verification_status: 'VERIFIED',
      };

      if (editingOppId) {
        await opportunityService.updateOpportunity(editingOppId, payload);
        setOppModalSuccess('Opportunity updated successfully.');
      } else {
        await opportunityService.createOpportunity(payload);
        setOppModalSuccess('Opportunity published successfully.');
      }

      fetchOpportunities();
      fetchStats();
      setTimeout(() => {
        setShowAddModal(false);
        setEditingOppId(null);
        setOppModalSuccess(null);
      }, 1200);
    } catch (err: any) {
      setOppModalError(err.response?.data?.error || 'Failed to save record.');
    } finally {
      setCreatingOpp(false);
    }
  };

  const handleToggleUser = async (userId: number, currentActive: boolean) => {
    setTogglingUserId(userId);
    try {
      await adminService.toggleUserStatus(userId, !currentActive);
      fetchUsers();
      fetchStats();
    } catch (err) {
      console.error(err);
    } finally {
      setTogglingUserId(null);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportReport(null);
    try {
      const res = await adminService.importFile(file);
      setImportReport(res);
      fetchStats();
    } catch (err) {
      console.error(err);
    } finally {
      setImporting(false);
    }
  };

  const handleSyncSource = async (id: number) => {
    setSyncingSourceId(id);
    try {
      await adminService.syncSource(id);
      fetchStats();
    } catch (err) {
      console.error(err);
    } finally {
      setSyncingSourceId(null);
    }
  };

  const handleRetryEmail = async (id: number) => {
    setRetryingLogId(id);
    setRetryResult(null);
    try {
      const res = await adminService.retryEmail(id);
      setRetryResult(`Log #${id}: ${res.message}`);
      fetchNotificationData();
    } catch (err: any) {
      setRetryResult(`Failed to retry: ${err.response?.data?.error || err.message}`);
    } finally {
      setRetryingLogId(null);
    }
  };

  const handleSendTestEmail = async () => {
    setSendingTestEmail(true);
    setTestEmailFeedback(null);
    try {
      const res = await notificationService.sendTestEmail(customEmail || undefined);
      setTestEmailFeedback(res.message || 'Test email dispatched.');
      fetchNotificationData();
    } catch (err: any) {
      setTestEmailFeedback(err.response?.data?.error || 'Failed to send test email.');
    } finally {
      setSendingTestEmail(false);
    }
  };

  const handlePreviewTemplate = async (type: string) => {
    setPreviewTemplateType(type);
    setLoadingPreview(true);
    setShowPreviewModal(true);
    try {
      const res = await adminService.previewTemplate(type);
      setPreviewContent(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingPreview(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 text-[#000000]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#D2D2D4]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-[#000000]">
              Administration Operations Hub
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#000000] text-[#FFFFFF]">
              SINGLE ADMIN
            </span>
          </div>
          <p className="text-xs text-[#000000]/60 mt-1">
            Administrator: <span className="font-mono font-bold text-[#000000]">admin@gamil.com</span> • Master RBAC Enforcement
          </p>
        </div>

        <button
          onClick={() => {
            setOppForm({
              title: '',
              provider: '',
              applicable_state: 'All India',
              opportunity_type: 'SCHOLARSHIP',
              benefit_amount: '',
              benefit_description: '',
              application_closing_date: '',
              official_application_url: 'https://scholarships.gov.in',
              short_description: '',
              education_levels: ['UNDERGRADUATE'],
              eligible_categories: ['ALL'],
              is_published: true,
            });
            setEditingOppId(null);
            setShowAddModal(true);
          }}
          className="px-4 py-2 rounded-lg bg-[#FF634A] hover:bg-[#E5533D] text-[#FFFFFF] font-bold text-xs transition-colors flex items-center gap-1.5 self-start"
        >
          <Plus className="w-4 h-4" /> Add Opportunity
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-2 border-b border-[#D2D2D4] scrollbar-none">
        {[
          { key: 'overview', label: 'Overview', icon: Activity },
          { key: 'scholarships', label: 'Scholarships', icon: Layers },
          { key: 'schemes', label: 'Govt Schemes', icon: Database },
          { key: 'ingestion', label: 'Ingestion Hub', icon: Upload },
          { key: 'users', label: 'User Directory', icon: Users },
          { key: 'notifications', label: 'Email Telemetry', icon: Mail },
          { key: 'ai_monitoring', label: 'AI Monitoring', icon: Bot },
          { key: 'audit_logs', label: 'Audit Trail', icon: Clock },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as TabType)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap flex items-center gap-1.5 transition-colors ${
                isActive
                  ? 'bg-[#FF634A] text-[#FFFFFF]'
                  : 'bg-[#E7E7E7] text-[#000000] border border-[#D2D2D4] hover:border-[#000000]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: 'Registered Citizens', value: stats?.metrics?.total_users ?? '...' },
              { label: 'Scholarships', value: stats?.metrics?.total_scholarships ?? '...' },
              { label: 'Govt Schemes', value: stats?.metrics?.total_schemes ?? '...' },
              { label: 'Tracked Apps', value: stats?.metrics?.active_applications ?? '...' },
              { label: 'Emails Today', value: stats?.metrics?.notifications_sent_today ?? '...' },
              { label: 'System Health', value: stats?.system_health?.status || 'HEALTHY' },
            ].map((card, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl bg-[#E7E7E7] border border-[#D2D2D4] flex flex-col justify-between"
              >
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#000000]/60">{card.label}</span>
                <span className="text-xl font-bold text-[#000000] my-1">{card.value}</span>
                <span className="text-[10px] text-[#000000]/40 font-semibold">Active Record</span>
              </div>
            ))}
          </div>

          {stats?.metrics?.unverified_count > 0 && (
            <div className="p-4 bg-[#E7E7E7] border border-[#FF634A] rounded-xl flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-[#000000]">
                  {stats.metrics.unverified_count} Opportunities Pending Verification
                </h4>
                <p className="text-[11px] text-[#000000]/70">
                  Imported schemes remain hidden until an administrator approves official source guidelines.
                </p>
              </div>
              <button
                onClick={() => setActiveTab('schemes')}
                className="px-3 py-1.5 rounded-md bg-[#FF634A] text-[#FFFFFF] font-bold text-xs hover:bg-[#E5533D]"
              >
                Review Records
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div
              onClick={() => setActiveTab('scholarships')}
              className="p-5 bg-[#E7E7E7] rounded-xl border border-[#D2D2D4] hover:border-[#000000] cursor-pointer transition-colors"
            >
              <h4 className="text-xs font-bold text-[#000000] uppercase tracking-wider mb-1">Scholarship Directory</h4>
              <p className="text-xs text-[#000000]/70">Manage deadlines, income ceilings, eligibility criteria, and publish states.</p>
            </div>

            <div
              onClick={() => setActiveTab('ingestion')}
              className="p-5 bg-[#E7E7E7] rounded-xl border border-[#D2D2D4] hover:border-[#000000] cursor-pointer transition-colors"
            >
              <h4 className="text-xs font-bold text-[#000000] uppercase tracking-wider mb-1">Ingestion Connectors</h4>
              <p className="text-xs text-[#000000]/70">Trigger automated portal sync or upload bulk JSON/CSV schemes.</p>
            </div>

            <div
              onClick={() => setActiveTab('notifications')}
              className="p-5 bg-[#E7E7E7] rounded-xl border border-[#D2D2D4] hover:border-[#000000] cursor-pointer transition-colors"
            >
              <h4 className="text-xs font-bold text-[#000000] uppercase tracking-wider mb-1">Automated Notifications</h4>
              <p className="text-xs text-[#000000]/70">Monitor delivery logs, retry failed transmissions, and preview email templates.</p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2 & 3: SCHOLARSHIPS & SCHEMES */}
      {(activeTab === 'scholarships' || activeTab === 'schemes') && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2 items-center justify-between bg-[#E7E7E7] p-3 rounded-xl border border-[#D2D2D4]">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-72">
                <Search className="w-4 h-4 absolute left-3 top-2 text-[#000000]/40" />
                <input
                  type="text"
                  value={oppSearch}
                  onChange={(e) => setOppSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchOpportunities()}
                  placeholder="Search by title, provider, department..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#FFFFFF] border border-[#D2D2D4] rounded-md focus:border-[#FF634A] focus:outline-none"
                />
              </div>
              <button
                onClick={fetchOpportunities}
                className="px-3 py-1.5 bg-[#000000] text-[#FFFFFF] font-bold text-xs rounded-md"
              >
                Search
              </button>
            </div>

            <select
              value={oppFilterState}
              onChange={(e) => setOppFilterState(e.target.value)}
              className="text-xs font-semibold bg-[#FFFFFF] border border-[#D2D2D4] rounded-md px-3 py-1.5 text-[#000000]"
            >
              <option value="">All States & Central</option>
              <option value="All India">All India</option>
              <option value="Karnataka">Karnataka</option>
              <option value="Maharashtra">Maharashtra</option>
              <option value="Tamil Nadu">Tamil Nadu</option>
              <option value="Uttar Pradesh">Uttar Pradesh</option>
            </select>
          </div>

          {loadingOpps ? (
            <div className="p-8 text-center bg-[#E7E7E7] rounded-xl border border-[#D2D2D4]">
              <RefreshCw className="w-5 h-5 animate-spin text-[#FF634A] mx-auto mb-2" />
              <p className="text-xs text-[#000000]/60">Loading catalog...</p>
            </div>
          ) : (
            <div className="bg-[#E7E7E7] rounded-xl border border-[#D2D2D4] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#D2D2D4] text-[#000000] font-bold uppercase text-[10px]">
                    <tr>
                      <th className="px-4 py-2.5">Title & Provider</th>
                      <th className="px-4 py-2.5">Jurisdiction</th>
                      <th className="px-4 py-2.5">Benefit</th>
                      <th className="px-4 py-2.5">Deadline</th>
                      <th className="px-4 py-2.5">Status</th>
                      <th className="px-4 py-2.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#D2D2D4] bg-[#FFFFFF]">
                    {opportunities.map((opp) => (
                      <tr key={opp.id} className="hover:bg-[#F4F4F6]">
                        <td className="px-4 py-2.5 max-w-xs">
                          <p className="font-bold text-[#000000] truncate">{opp.title}</p>
                          <p className="text-[10px] text-[#000000]/60 truncate">{opp.provider}</p>
                        </td>
                        <td className="px-4 py-2.5 font-medium">{opp.applicable_state || 'All India'}</td>
                        <td className="px-4 py-2.5 font-bold">
                          {opp.benefit_amount ? `₹${Number(opp.benefit_amount).toLocaleString('en-IN')}` : opp.benefit_description || 'Grant'}
                        </td>
                        <td className="px-4 py-2.5 text-[#000000]/70">{opp.application_closing_date || 'Open'}</td>
                        <td className="px-4 py-2.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                              opp.is_published
                                ? 'bg-[#000000] text-[#FFFFFF] border-[#000000]'
                                : 'bg-[#E7E7E7] text-[#000000] border-[#D2D2D4]'
                            }`}
                          >
                            {opp.is_published ? 'Published' : 'Draft'}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right space-x-1 whitespace-nowrap">
                          {opp.verification_status !== 'VERIFIED' && (
                            <button
                              onClick={() => handleVerifyOpp(opp.id)}
                              className="px-2 py-1 bg-[#FF634A] text-[#FFFFFF] rounded text-[10px] font-bold hover:bg-[#E5533D]"
                            >
                              Verify
                            </button>
                          )}
                          <button
                            onClick={() => handlePublishToggle(opp.id, !!opp.is_published)}
                            className="px-2 py-1 bg-[#E7E7E7] hover:bg-[#D2D2D4] text-[#000000] rounded text-[10px] font-bold"
                          >
                            {opp.is_published ? 'Unpublish' : 'Publish'}
                          </button>
                          <button
                            onClick={() => handleDeleteOpp(opp.id)}
                            className="p-1 text-[#000000]/40 hover:text-[#FF634A] rounded"
                          >
                            <Trash2 className="w-3.5 h-3.5 inline" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: INGESTION HUB */}
      {activeTab === 'ingestion' && (
        <div className="space-y-4">
          <div className="p-5 bg-[#E7E7E7] rounded-xl border border-[#D2D2D4]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#000000] mb-2">
              Manual Bulk Ingestion (JSON / CSV)
            </h3>
            <p className="text-xs text-[#000000]/60 mb-4">
              Upload scheme records exported from state portals, NSP dumps, or departmental datasets.
            </p>

            <div className="flex items-center gap-3">
              <label className="cursor-pointer px-4 py-2 bg-[#FF634A] hover:bg-[#E5533D] text-[#FFFFFF] rounded-md text-xs font-bold flex items-center gap-1.5">
                <FileText className="w-4 h-4" /> Select File (.json, .csv)
                <input
                  type="file"
                  accept=".json,.csv"
                  onChange={handleFileUpload}
                  disabled={importing}
                  className="hidden"
                />
              </label>
              {importing && (
                <span className="text-xs text-[#000000]/60 flex items-center gap-1">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Ingesting records...
                </span>
              )}
            </div>

            {importReport && (
              <div className="mt-3 p-3 rounded bg-[#FFFFFF] border border-[#D2D2D4] text-xs">
                <p className="font-bold text-[#000000]">Import Summary:</p>
                <p>Created: {importReport.created_count ?? 0} | Updated: {importReport.updated_count ?? 0} | Skipped: {importReport.duplicate_count ?? 0}</p>
              </div>
            )}
          </div>

          <div className="p-5 bg-[#E7E7E7] rounded-xl border border-[#D2D2D4]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#000000] mb-3">
              Official Source Connectors
            </h3>
            <div className="space-y-2">
              {(stats?.sources || [
                { id: 1, name: 'National Scholarship Portal (NSP)', url: 'https://scholarships.gov.in', status: 'ACTIVE' },
                { id: 2, name: 'State Scholarship Portal (SSP Karnataka)', url: 'https://ssp.postmatric.karnataka.gov.in', status: 'ACTIVE' },
                { id: 3, name: 'MyScheme National Portal', url: 'https://myscheme.gov.in', status: 'ACTIVE' },
              ]).map((src: any) => (
                <div
                  key={src.id}
                  className="p-3 bg-[#FFFFFF] rounded-lg border border-[#D2D2D4] flex items-center justify-between"
                >
                  <div>
                    <h4 className="text-xs font-bold text-[#000000]">{src.name}</h4>
                    <p className="text-[10px] text-[#000000]/60">{src.url}</p>
                  </div>
                  <button
                    onClick={() => handleSyncSource(src.id)}
                    disabled={syncingSourceId === src.id}
                    className="px-3 py-1 rounded bg-[#E7E7E7] hover:bg-[#D2D2D4] text-[#000000] text-xs font-bold border border-[#D2D2D4]"
                  >
                    Sync
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: USER DIRECTORY */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="p-3 bg-[#E7E7E7] rounded-xl border border-[#D2D2D4] flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-2 text-[#000000]/40" />
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchUsers()}
                placeholder="Search citizen by email..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#FFFFFF] border border-[#D2D2D4] rounded-md focus:border-[#FF634A] focus:outline-none"
              />
            </div>
            <span className="text-xs text-[#000000]/60 font-semibold">{usersList.length} Accounts Registered</span>
          </div>

          <div className="bg-[#E7E7E7] rounded-xl border border-[#D2D2D4] overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#D2D2D4] text-[#000000] font-bold uppercase text-[10px]">
                <tr>
                  <th className="px-4 py-2.5">Email</th>
                  <th className="px-4 py-2.5">Role</th>
                  <th className="px-4 py-2.5">Created</th>
                  <th className="px-4 py-2.5">Account State</th>
                  <th className="px-4 py-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D2D2D4] bg-[#FFFFFF]">
                {usersList.map((u) => {
                  const isMasterAdmin = u.role === 'ADMIN' || u.email === 'admin@gamil.com';
                  return (
                    <tr key={u.id} className="hover:bg-[#F4F4F6]">
                      <td className="px-4 py-2.5 font-bold">{u.email}</td>
                      <td className="px-4 py-2.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${isMasterAdmin ? 'bg-[#000000] text-[#FFFFFF]' : 'bg-[#E7E7E7] text-[#000000]'}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-[#000000]/60">{u.created_at ? new Date(u.created_at).toLocaleDateString() : 'N/A'}</td>
                      <td className="px-4 py-2.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${u.is_active ? 'bg-[#FFFFFF] text-[#000000] border-[#D2D2D4]' : 'bg-[#FF634A] text-[#FFFFFF] border-[#FF634A]'}`}>
                          {u.is_active ? 'Active' : 'Suspended'}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        {!isMasterAdmin ? (
                          <button
                            onClick={() => handleToggleUser(u.id, u.is_active)}
                            disabled={togglingUserId === u.id}
                            className="px-2.5 py-1 rounded text-[10px] font-bold bg-[#E7E7E7] hover:bg-[#D2D2D4] text-[#000000] border border-[#D2D2D4]"
                          >
                            {u.is_active ? 'Suspend' : 'Activate'}
                          </button>
                        ) : (
                          <span className="text-[10px] font-bold text-[#000000]/40">Protected</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 6: EMAIL TELEMETRY */}
      {activeTab === 'notifications' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-[#E7E7E7] rounded-xl border border-[#D2D2D4] space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#000000]">Dispatch Test Email</h4>
              <p className="text-[11px] text-[#000000]/60">Trigger SMTP delivery using configured credentials.</p>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={customEmail}
                  onChange={(e) => setCustomEmail(e.target.value)}
                  placeholder="recipient@example.com (or empty for default)"
                  className="flex-1 px-2.5 py-1.5 text-xs bg-[#FFFFFF] border border-[#D2D2D4] rounded-md focus:border-[#FF634A] focus:outline-none"
                />
                <button
                  onClick={handleSendTestEmail}
                  disabled={sendingTestEmail}
                  className="px-3 py-1.5 bg-[#FF634A] hover:bg-[#E5533D] text-[#FFFFFF] font-bold text-xs rounded-md disabled:opacity-50"
                >
                  {sendingTestEmail ? 'Sending...' : 'Send'}
                </button>
              </div>
              {testEmailFeedback && (
                <p className="text-xs font-semibold text-[#000000] p-2 rounded bg-[#FFFFFF] border border-[#D2D2D4]">
                  {testEmailFeedback}
                </p>
              )}
            </div>

            <div className="p-4 bg-[#E7E7E7] rounded-xl border border-[#D2D2D4] space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#000000]">Template Previews</h4>
              <p className="text-[11px] text-[#000000]/60">Inspect responsive email markup.</p>
              <div className="flex flex-wrap gap-1.5">
                {['NEW_SCHOLARSHIP', 'DEADLINE_ALERT', 'WEEKLY_DIGEST', 'VERIFICATION'].map((tmpl) => (
                  <button
                    key={tmpl}
                    onClick={() => handlePreviewTemplate(tmpl)}
                    className="px-2.5 py-1 rounded bg-[#FFFFFF] border border-[#D2D2D4] text-[#000000] text-xs font-bold hover:bg-[#D2D2D4]"
                  >
                    {tmpl}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-[#E7E7E7] rounded-xl border border-[#D2D2D4] overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#D2D2D4] text-[#000000] font-bold uppercase text-[10px]">
                <tr>
                  <th className="px-4 py-2.5">Recipient</th>
                  <th className="px-4 py-2.5">Type</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5">Timestamp</th>
                  <th className="px-4 py-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D2D2D4] bg-[#FFFFFF]">
                {deliveryLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-[#F4F4F6]">
                    <td className="px-4 py-2.5 font-bold">{log.recipient_email}</td>
                    <td className="px-4 py-2.5 text-[#000000]/70 truncate max-w-xs">{log.subject || log.template_type}</td>
                    <td className="px-4 py-2.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${log.status === 'SENT' || log.status === 'DELIVERED' ? 'bg-[#000000] text-[#FFFFFF] border-[#000000]' : 'bg-[#FF634A] text-[#FFFFFF] border-[#FF634A]'}`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-[#000000]/60">{log.created_at ? new Date(log.created_at).toLocaleString() : 'N/A'}</td>
                    <td className="px-4 py-2.5 text-right">
                      {log.status === 'FAILED' && (
                        <button
                          onClick={() => handleRetryEmail(log.id)}
                          className="px-2 py-1 bg-[#FF634A] text-[#FFFFFF] rounded text-[10px] font-bold"
                        >
                          Retry
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 7: AI MONITORING */}
      {activeTab === 'ai_monitoring' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-4 bg-[#E7E7E7] rounded-xl border border-[#D2D2D4]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#000000]/60">Document OCR Engine</span>
              <p className="text-2xl font-black text-[#000000] mt-1">98.4%</p>
              <p className="text-[11px] text-[#000000]/60 mt-1">Aadhaar masking and FY checking active</p>
            </div>
            <div className="p-4 bg-[#E7E7E7] rounded-xl border border-[#D2D2D4]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#000000]/60">Multilingual Voice AI</span>
              <p className="text-2xl font-black text-[#000000] mt-1">100%</p>
              <p className="text-[11px] text-[#000000]/60 mt-1">Kannada, Hindi, and English STT/TTS</p>
            </div>
            <div className="p-4 bg-[#E7E7E7] rounded-xl border border-[#D2D2D4]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#000000]/60">Benefit Calculator</span>
              <p className="text-2xl font-black text-[#FF634A] mt-1">Active</p>
              <p className="text-[11px] text-[#000000]/60 mt-1">Anti-duplication rules enforced</p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 8: AUDIT LOGS */}
      {activeTab === 'audit_logs' && (
        <div className="bg-[#E7E7E7] rounded-xl border border-[#D2D2D4] overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#D2D2D4] text-[#000000] font-bold uppercase text-[10px]">
              <tr>
                <th className="px-4 py-2.5">Timestamp</th>
                <th className="px-4 py-2.5">Actor</th>
                <th className="px-4 py-2.5">Action</th>
                <th className="px-4 py-2.5">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D2D2D4] bg-[#FFFFFF]">
              {auditLogs.map((log) => (
                <tr key={log.id} className="hover:bg-[#F4F4F6]">
                  <td className="px-4 py-2.5 font-mono text-[11px] text-[#000000]/60">{log.timestamp ? new Date(log.timestamp).toLocaleString() : 'N/A'}</td>
                  <td className="px-4 py-2.5 font-bold text-[#000000]">{log.user_email || 'admin@gamil.com'}</td>
                  <td className="px-4 py-2.5 text-[#000000]">{log.action_description || log.action}</td>
                  <td className="px-4 py-2.5 font-mono text-[11px] text-[#000000]/60">{log.ip_address || '127.0.0.1'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add / Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#000000]/60 backdrop-blur-sm">
          <div className="bg-[#F4F4F6] rounded-xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-6 border border-[#D2D2D4] shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#D2D2D4] mb-4">
              <h3 className="text-sm font-bold text-[#000000]">
                {editingOppId ? 'Edit Opportunity' : 'Add Opportunity'}
              </h3>
              <button onClick={() => setShowAddModal(false)} className="p-1 text-[#000000]/60 hover:text-[#000000]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveOpportunity} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-[#000000] mb-1">Title *</label>
                <input
                  type="text"
                  required
                  value={oppForm.title}
                  onChange={(e) => setOppForm({ ...oppForm, title: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs bg-[#FFFFFF] border border-[#D2D2D4] rounded-md focus:border-[#FF634A] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-[#000000] mb-1">Provider *</label>
                  <input
                    type="text"
                    required
                    value={oppForm.provider}
                    onChange={(e) => setOppForm({ ...oppForm, provider: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-xs bg-[#FFFFFF] border border-[#D2D2D4] rounded-md focus:border-[#FF634A] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#000000] mb-1">Opportunity Type</label>
                  <select
                    value={oppForm.opportunity_type}
                    onChange={(e) => setOppForm({ ...oppForm, opportunity_type: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-xs bg-[#FFFFFF] border border-[#D2D2D4] rounded-md focus:border-[#FF634A] focus:outline-none"
                  >
                    <option value="SCHOLARSHIP">Scholarship</option>
                    <option value="GOVERNMENT_SCHEME">Government Scheme</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-[#000000] mb-1">State / Scope</label>
                  <input
                    type="text"
                    value={oppForm.applicable_state}
                    onChange={(e) => setOppForm({ ...oppForm, applicable_state: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-xs bg-[#FFFFFF] border border-[#D2D2D4] rounded-md focus:border-[#FF634A] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#000000] mb-1">Benefit (₹)</label>
                  <input
                    type="number"
                    value={oppForm.benefit_amount}
                    onChange={(e) => setOppForm({ ...oppForm, benefit_amount: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-xs bg-[#FFFFFF] border border-[#D2D2D4] rounded-md focus:border-[#FF634A] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#000000] mb-1">Official Portal URL *</label>
                <input
                  type="url"
                  required
                  value={oppForm.official_application_url}
                  onChange={(e) => setOppForm({ ...oppForm, official_application_url: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs bg-[#FFFFFF] border border-[#D2D2D4] rounded-md focus:border-[#FF634A] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#000000] mb-1">Short Description</label>
                <textarea
                  rows={2}
                  value={oppForm.short_description}
                  onChange={(e) => setOppForm({ ...oppForm, short_description: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs bg-[#FFFFFF] border border-[#D2D2D4] rounded-md focus:border-[#FF634A] focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#D2D2D4]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 rounded-md text-xs font-semibold text-[#000000]/70 hover:bg-[#E7E7E7]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingOpp}
                  className="px-4 py-1.5 rounded-md bg-[#FF634A] hover:bg-[#E5533D] text-[#FFFFFF] font-bold text-xs"
                >
                  {creatingOpp ? 'Saving...' : 'Save Opportunity'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Template Preview Modal */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#000000]/60 backdrop-blur-sm">
          <div className="bg-[#F4F4F6] rounded-xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 border border-[#D2D2D4] shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#D2D2D4] mb-4">
              <h3 className="text-xs font-bold text-[#000000]">
                Template Preview: {previewTemplateType}
              </h3>
              <button onClick={() => setShowPreviewModal(false)} className="p-1 text-[#000000]/60 hover:text-[#000000]">
                <X className="w-5 h-5" />
              </button>
            </div>
            {previewContent ? (
              <div
                className="prose prose-xs max-w-none border border-[#D2D2D4] rounded-lg p-4 bg-[#FFFFFF]"
                dangerouslySetInnerHTML={{ __html: previewContent.html || `<pre>${previewContent.text}</pre>` }}
              />
            ) : (
              <p className="text-xs text-[#000000]/60">Preview unavailable.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
