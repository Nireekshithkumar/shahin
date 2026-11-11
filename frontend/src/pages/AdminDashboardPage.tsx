import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import {
  ShieldAlert, Database, Upload, RefreshCw, CheckCircle2,
  AlertTriangle, Check, ExternalLink, Activity, Layers, Mail,
  Send, Eye, AlertOctagon, Clock, Users, Play, Filter, Plus, X, Sparkles
} from 'lucide-react';
import { adminService, notificationService, opportunityService } from '../services/scholarsetuService';

export const AdminDashboardPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'ingestion' | 'notifications'>('ingestion');

  // Ingestion Hub State
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [importReport, setImportReport] = useState<any>(null);
  const [syncingSourceId, setSyncingSourceId] = useState<number | null>(null);

  // Notification Monitoring State
  const [notifStats, setNotifStats] = useState<any>(null);
  const [loadingNotifStats, setLoadingNotifStats] = useState(false);
  const [deliveryLogs, setDeliveryLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [logFilterStatus, setLogFilterStatus] = useState<string>('');
  const [logSearch, setLogSearch] = useState<string>('');
  const [retryingLogId, setRetryingLogId] = useState<number | null>(null);
  const [retryResult, setRetryResult] = useState<string | null>(null);

  // Template Preview State
  const [previewTemplateType, setPreviewTemplateType] = useState<string>('NEW_SCHOLARSHIP');
  const [previewContent, setPreviewContent] = useState<{ html: string; text: string } | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  // Test Email State
  const [sendingTestEmail, setSendingTestEmail] = useState(false);
  const [testEmailFeedback, setTestEmailFeedback] = useState<string | null>(null);
  const [customEmail, setCustomEmail] = useState('');

  // Add Scholarship Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [creatingOpp, setCreatingOpp] = useState(false);
  const [createOppSuccess, setCreateOppSuccess] = useState<string | null>(null);
  const [createOppError, setCreateOppError] = useState<string | null>(null);

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
  });

  const handleDemoFill = () => {
    const nextMonth = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
    setOppForm({
      title: 'Dr. APJ Abdul Kalam National Higher Education Scholarship 2026',
      provider: 'Department of Higher Education, Government of India',
      applicable_state: 'All India',
      opportunity_type: 'SCHOLARSHIP',
      benefit_amount: '60000',
      benefit_description: '₹60,000 per year + monthly living stipend',
      application_closing_date: nextMonth,
      official_application_url: 'https://scholarships.gov.in',
      short_description: 'National merit-cum-means scholarship for degree students in Science, Engineering, and Commerce with family income under ₹4,50,000.',
      education_levels: ['UNDERGRADUATE', 'POSTGRADUATE'],
      eligible_categories: ['ALL'],
    });
  };

  const handleCreateOpportunity = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingOpp(true);
    setCreateOppError(null);
    setCreateOppSuccess(null);
    try {
      const payload = {
        ...oppForm,
        benefit_amount: oppForm.benefit_amount ? parseFloat(oppForm.benefit_amount) : null,
        verification_status: 'OFFICIAL_VERIFIED',
        source_name: 'Admin Manual Entry',
      };
      const created = await opportunityService.createOpportunity(payload);
      setCreateOppSuccess(`Successfully published "${created.title}"!`);
      fetchStats();
      setTimeout(() => {
        setShowAddModal(false);
        setCreateOppSuccess(null);
      }, 1500);
    } catch (err: any) {
      setCreateOppError(err.response?.data?.error || 'Failed to create scholarship. Please check all required fields.');
    } finally {
      setCreatingOpp(false);
    }
  };

  const handleSendTestEmail = async (overrideEmail?: string) => {
    setSendingTestEmail(true);
    setTestEmailFeedback(null);
    const emailToUse = (overrideEmail && overrideEmail.trim()) || customEmail.trim() || undefined;
    try {
      const res = await notificationService.sendTestEmail(emailToUse);
      if (res.delivery_status === 'SENT' || res.delivery_status === 'DELIVERED') {
        setTestEmailFeedback(res.message || `Test email dispatched to ${emailToUse || 'default'}.`);
      } else {
        setTestEmailFeedback(res.error_message ? `Delivery notice: ${res.error_message}` : res.message);
      }
      fetchNotificationStats();
      fetchDeliveryLogs();
    } catch (err: any) {
      setTestEmailFeedback(err.response?.data?.error || 'Failed to dispatch test email.');
    } finally {
      setSendingTestEmail(false);
    }
  };

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

  const fetchNotificationStats = async () => {
    setLoadingNotifStats(true);
    try {
      const data = await adminService.getNotificationStats();
      setNotifStats(data);
    } catch (err) {
      console.error('Failed to load notification stats', err);
    } finally {
      setLoadingNotifStats(false);
    }
  };

  const fetchDeliveryLogs = async () => {
    setLoadingLogs(true);
    try {
      const params: any = {};
      if (logFilterStatus) params.status = logFilterStatus;
      if (logSearch) params.search = logSearch;
      const res = await adminService.getDeliveryLogs(params);
      setDeliveryLogs(res.results || (Array.isArray(res) ? res : []));
    } catch (err) {
      console.error('Failed to load logs', err);
    } finally {
      setLoadingLogs(false);
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
      console.error('Failed to load preview', err);
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleRetryEmail = async (id: number) => {
    setRetryingLogId(id);
    setRetryResult(null);
    try {
      const res = await adminService.retryEmail(id);
      setRetryResult(`Log #${id}: ${res.message} (Status: ${res.status})`);
      fetchDeliveryLogs();
      fetchNotificationStats();
    } catch (err: any) {
      setRetryResult(`Failed to retry #${id}: ${err.response?.data?.error || err.message}`);
    } finally {
      setRetryingLogId(null);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchNotificationStats();
    fetchDeliveryLogs();
  }, []);

  useEffect(() => {
    if (activeTab === 'notifications') {
      fetchNotificationStats();
      fetchDeliveryLogs();
    }
  }, [activeTab, logFilterStatus]);

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

  const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#64748b'];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Top Header & Tab Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Activity className="w-6 h-6 text-blue-600" />
            ScholarSetu AI Administrative Operations
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time ingestion pipeline, official source connectors, and automated email notification telemetry.
          </p>
        </div>

        {/* Global tab switch */}
        <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold border border-slate-200">
          <button
            onClick={() => setActiveTab('ingestion')}
            className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'ingestion' ? 'bg-white text-slate-900 shadow-sm font-bold' : 'text-slate-600'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            Ingestion Hub
          </button>
          <button
            onClick={() => setActiveTab('notifications')}
            className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'notifications' ? 'bg-white text-slate-900 shadow-sm font-bold' : 'text-slate-600'
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            Notification System Telemetry
            {notifStats?.totals?.pending > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-blue-600 text-white text-[10px] font-black">
                {notifStats.totals.pending}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* SECTION 1: NOTIFICATION MONITORING & OPS HUB */}
      {/* ==================================================================== */}
      {activeTab === 'notifications' && (
        <div className="space-y-6">
          {/* Action Bar for Test Email */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Mail className="w-4 h-4 text-brand-600" />
                  Email Dispatcher &amp; Telemetry
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Monitor live SMTP delivery logs, preview responsive email templates, and trigger test dispatches.
                </p>
              </div>

              {/* Custom email input and dispatch button */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                <input
                  type="email"
                  placeholder="Enter your personal email (e.g. name@gmail.com)"
                  value={customEmail}
                  onChange={(e) => setCustomEmail(e.target.value)}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 w-full sm:w-72"
                />
                <button
                  type="button"
                  onClick={() => handleSendTestEmail()}
                  disabled={sendingTestEmail}
                  className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50 whitespace-nowrap"
                >
                  <Send className="w-3.5 h-3.5" />
                  {sendingTestEmail ? 'Dispatching...' : 'Send Live Test Email'}
                </button>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 flex items-start gap-2">
              <span className="font-bold text-brand-700 uppercase tracking-wider text-[10px] mt-0.5 px-1.5 py-0.5 rounded bg-brand-100">Info</span>
              <span>
                In the Admin Demo, the logged-in user is <code className="font-semibold text-slate-800 bg-white px-1.5 py-0.5 rounded border border-slate-200">admin@scholarsetu.gov.in</code> (a demo test domain).
                To test delivery to your real inbox, enter your personal email address above.
              </span>
            </div>
          </div>

          {testEmailFeedback && (
            <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-center justify-between">
              <span className="flex items-center gap-2 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                {testEmailFeedback}
              </span>
              <button
                type="button"
                onClick={() => setTestEmailFeedback(null)}
                className="text-blue-500 hover:text-blue-700 font-bold text-base leading-none ml-2"
              >
                &times;
              </button>
            </div>
          )}

          {/* Notification KPI Cards */}
          {notifStats && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                  <Send className="w-3 h-3 text-emerald-600" /> Sent (24h)
                </span>
                <p className="text-xl font-black text-emerald-600 mt-1">
                  {notifStats.totals.sent_24h}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">Total: {notifStats.totals.total_logged}</p>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-blue-600" /> Pending Outbox
                </span>
                <p className="text-xl font-black text-blue-600 mt-1">
                  {notifStats.totals.pending}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">Queued in database</p>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                  <RefreshCw className="w-3 h-3 text-amber-600" /> Retry Queue
                </span>
                <p className="text-xl font-black text-amber-600 mt-1">
                  {notifStats.totals.retrying}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">Backoff active</p>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                  <AlertOctagon className="w-3 h-3 text-rose-600" /> Failures / Bounces
                </span>
                <p className="text-xl font-black text-rose-600 mt-1">
                  {notifStats.totals.failed + notifStats.totals.bounced}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">Permanent failures</p>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                  <Users className="w-3 h-3 text-slate-600" /> Active Subs
                </span>
                <p className="text-xl font-black text-slate-900 mt-1">
                  {notifStats.totals.active_subscribers}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">Opted Out: {notifStats.totals.opted_out_users}</p>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-amber-600" /> Closing 30d
                </span>
                <p className="text-xl font-black text-amber-700 mt-1">
                  {notifStats.totals.upcoming_30d_deadlines}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">Active reminders</p>
              </div>
            </div>
          )}

          {/* Celery Periodic Scheduler Health & Template Previews */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Celery Scheduler Panel */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-600" />
                    Celery Beat Periodic Scheduler Health
                  </h3>
                  <p className="text-[11px] text-slate-500">Autonomous notification workers running on {notifStats?.scheduler?.timezone || 'Asia/Kolkata'}</p>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  Active (Redis Broker)
                </span>
              </div>

              <div className="space-y-2">
                {notifStats?.scheduler?.active_periodic_tasks?.map((taskName: string, idx: number) => (
                  <div key={idx} className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                    <span className="font-mono text-slate-800 text-[11px]">{taskName}</span>
                    <span className="text-emerald-600 font-bold text-[10px] flex items-center gap-1">
                      <Check className="w-3 h-3" /> Scheduled
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Template Inspector & Preview */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <Eye className="w-4 h-4 text-blue-600" />
                    Email Template Previews &amp; Brand Diagnostics
                  </h3>
                  <p className="text-[11px] text-slate-500">Inspect responsive HTML &amp; plain text rendering with live sample records</p>
                </div>
              </div>

              <p className="text-xs text-slate-600 mb-3">
                Select a notification template type to preview live typography, button links, and branding:
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { id: 'NEW_SCHOLARSHIP', label: 'New Scholarship' },
                  { id: 'DEADLINE_APPROACHING', label: 'Deadline Alert' },
                  { id: 'DEADLINE_EXTENDED', label: 'Deadline Extended' },
                  { id: 'REQUIREMENTS_CHANGED', label: 'Criteria Changed' },
                  { id: 'WEEKLY_DIGEST', label: 'Weekly Digest' },
                  { id: 'EMAIL_VERIFICATION', label: 'Verification Email' },
                  { id: 'PASSWORD_RESET', label: 'Password Reset' },
                  { id: 'TRACKER_REMINDER', label: 'Tracker Milestone' },
                  { id: 'RENEWAL_REMINDER', label: 'Renewal Notice' },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => handlePreviewTemplate(t.id)}
                    className="p-2 rounded-lg border border-slate-200 hover:border-blue-500 hover:bg-blue-50/30 text-left transition-all"
                  >
                    <span className="font-bold text-slate-800 text-[11px] block">{t.label}</span>
                    <span className="text-[9px] text-slate-400 block font-mono">{t.id}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Retry Result Alert */}
          {retryResult && (
            <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs font-semibold flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-blue-600 flex-shrink-0" />
              {retryResult}
            </div>
          )}

          {/* Delivery Logs Audit Table */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">System Email Delivery Logs (Audit Trail)</h3>
                <p className="text-[11px] text-slate-500">Live delivery records, provider acceptance codes, and retry queue controls</p>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  placeholder="Search recipient or subject..."
                  value={logSearch}
                  onChange={(e) => setLogSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchDeliveryLogs()}
                  className="rounded-lg border border-slate-200 px-3 py-1 text-xs text-slate-800 bg-white"
                />

                <select
                  value={logFilterStatus}
                  onChange={(e) => setLogFilterStatus(e.target.value)}
                  className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs text-slate-800 bg-white"
                >
                  <option value="">All Statuses</option>
                  <option value="SENT">Sent</option>
                  <option value="QUEUED">Queued</option>
                  <option value="RETRYING">Retrying</option>
                  <option value="FAILED">Failed</option>
                  <option value="SUPPRESSED_DUPLICATE">Suppressed</option>
                </select>

                <button
                  onClick={fetchDeliveryLogs}
                  className="px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center gap-1"
                >
                  <RefreshCw className={`w-3 h-3 ${loadingLogs ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>
            </div>

            {loadingLogs ? (
              <div className="space-y-2 animate-pulse">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-12 bg-slate-50 rounded-lg" />
                ))}
              </div>
            ) : deliveryLogs.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-xs">
                No delivery logs matching the current filter.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px]">
                      <th className="pb-2">Time</th>
                      <th className="pb-2">Recipient</th>
                      <th className="pb-2">Notification Type</th>
                      <th className="pb-2">Subject / Message</th>
                      <th className="pb-2">Status</th>
                      <th className="pb-2">Retries</th>
                      <th className="pb-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {deliveryLogs.map((log: any) => (
                      <tr key={log.id} className="hover:bg-slate-50/50">
                        <td className="py-2.5 text-slate-500 whitespace-nowrap">
                          {new Date(log.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                        </td>
                        <td className="py-2.5 font-mono text-[11px] text-slate-700 whitespace-nowrap">
                          {log.recipient_email}
                        </td>
                        <td className="py-2.5 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-[10px] font-medium text-slate-700">
                            {log.notification_type}
                          </span>
                        </td>
                        <td className="py-2.5 pr-2 max-w-xs">
                          <span className="font-semibold text-slate-900 block truncate">{log.subject}</span>
                          {log.error_message && (
                            <span className="text-[10px] text-rose-600 block truncate">
                              [{log.error_category || 'ERROR'}] {log.error_message}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              log.status === 'SENT' || log.status === 'DELIVERED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : log.status === 'QUEUED'
                                ? 'bg-blue-100 text-blue-800'
                                : log.status === 'RETRYING'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {log.status}
                          </span>
                        </td>
                        <td className="py-2.5 whitespace-nowrap text-slate-500 text-[11px]">
                          {log.retry_count} / {log.max_retries || 3}
                        </td>
                        <td className="py-2.5 text-right whitespace-nowrap">
                          {(log.status === 'FAILED' || log.status === 'RETRYING') && (
                            <button
                              onClick={() => handleRetryEmail(log.id)}
                              disabled={retryingLogId === log.id}
                              className="px-2.5 py-1 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[10px] inline-flex items-center gap-1"
                            >
                              <RefreshCw className={`w-3 h-3 ${retryingLogId === log.id ? 'animate-spin' : ''}`} />
                              Retry Send
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* SECTION 2: OPPORTUNITY INGESTION & DATA SYNC HUB */}
      {/* ==================================================================== */}
      {activeTab === 'ingestion' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-200">
            <div>
              <h2 className="text-sm font-bold text-slate-800">Dataset Ingestion &amp; Direct Entry</h2>
              <p className="text-xs text-slate-500">Create scholarships directly with a single click or upload bulk CSV/JSON datasets.</p>
            </div>
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => { setShowAddModal(true); handleDemoFill(); }}
                className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-md shadow-brand-500/20 flex items-center gap-1.5 transition-all"
              >
                <Plus className="w-4 h-4" />
                Add Scholarship Directly
              </button>
              <label className="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs border border-slate-200 shadow-sm cursor-pointer flex items-center gap-1.5 transition-all">
                <Upload className="w-4 h-4 text-slate-500" />
                {importing ? 'Importing...' : 'Upload CSV / JSON'}
                <input
                  type="file"
                  accept=".csv,.json"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={importing}
                />
              </label>
            </div>
          </div>

          {importReport && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs">
              <p className="font-bold text-emerald-900 flex items-center gap-1.5 mb-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Import Job #{importReport.job_id} Completed Successfully!
              </p>
              <p className="text-emerald-800">
                Total Records: <strong>{importReport.total}</strong> • Imported: <strong>{importReport.imported}</strong> •
                Duplicates Flagged: <strong>{importReport.duplicates_flagged}</strong>
              </p>
            </div>
          )}

          {/* Ingestion KPI Cards */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                <p className="text-xs font-semibold text-slate-500">Total Opportunities</p>
                <p className="text-2xl font-black text-blue-700 mt-1">
                  {stats.overview.total_opportunities}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">Across All 28 States &amp; UTs</p>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                <p className="text-xs font-semibold text-slate-500">Official Source Verified</p>
                <p className="text-2xl font-black text-emerald-600 mt-1">
                  {stats.overview.verified_opportunities}
                </p>
                <p className="text-[10px] text-emerald-700 mt-0.5">100% Provenance Confirmed</p>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                <p className="text-xs font-semibold text-slate-500">Closing Within 30 Days</p>
                <p className="text-2xl font-black text-amber-600 mt-1">
                  {stats.overview.closing_soon_count}
                </p>
                <p className="text-[10px] text-amber-700 mt-0.5">Active Countdown Reminders</p>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                <p className="text-xs font-semibold text-slate-500">Active Source Feeds</p>
                <p className="text-2xl font-black text-slate-800 mt-1">
                  {stats.sources?.length || 0}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">NSP, myScheme, UGC &amp; State</p>
              </div>
            </div>
          )}

          {/* Charts Section */}
          {stats && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <h3 className="font-bold text-slate-900 text-xs mb-4">Opportunities Distribution by State</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.state_breakdown}>
                      <XAxis dataKey="applicable_state" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#2563eb" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <h3 className="font-bold text-slate-900 text-xs mb-4">Distribution by Scheme Classification</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats.type_breakdown}
                        dataKey="count"
                        nameKey="opportunity_type"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label
                      >
                        {stats.type_breakdown?.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* Official Source Connectors Registry Table */}
          {stats?.sources && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Official Indian Source Connectors Registry</h3>
                  <p className="text-xs text-slate-500">Live connectors monitoring official government scholarship portals</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left text-slate-600">
                  <thead className="bg-slate-50 text-[11px] uppercase font-bold text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Portal Name</th>
                      <th className="py-2.5 px-3">Domain</th>
                      <th className="py-2.5 px-3">Records Ingested</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {stats.sources.map((src: any) => (
                      <tr key={src.id} className="hover:bg-slate-50/50">
                        <td className="py-3 px-3 font-bold text-slate-900">{src.name}</td>
                        <td className="py-3 px-3 font-mono text-slate-500">{src.domain}</td>
                        <td className="py-3 px-3 font-semibold text-emerald-700">{src.records_imported} items</td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            {src.verification_status}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() => handleSyncSource(src.id)}
                            disabled={syncingSourceId === src.id}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center gap-1 ml-auto"
                          >
                            <RefreshCw className={`w-3 h-3 ${syncingSourceId === src.id ? 'animate-spin text-blue-600' : ''}`} />
                            Sync Now
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

      {/* TEMPLATE PREVIEW MODAL */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Template Preview: {previewTemplateType}</h3>
                <p className="text-[11px] text-slate-500">Live rendered HTML and typography test</p>
              </div>
              <button
                onClick={() => setShowPreviewModal(false)}
                className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-600 font-bold text-xs"
              >
                Close
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-slate-100">
              {loadingPreview ? (
                <div className="text-center py-20 text-slate-500 text-xs">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                  Rendering template with verified sample records...
                </div>
              ) : previewContent ? (
                <div
                  className="bg-white shadow-sm rounded-xl overflow-hidden"
                  dangerouslySetInnerHTML={{ __html: previewContent.html }}
                />
              ) : (
                <div className="text-center py-10 text-slate-400 text-xs">Could not load preview.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* ADD SCHOLARSHIP DIRECT ENTRY MODAL */}
      {/* ==================================================================== */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Plus className="w-4 h-4 text-brand-600" />
                  Add Demo Scholarship / Scheme
                </h3>
                <p className="text-[11px] text-slate-500">Instantly create and publish verified opportunities for testing</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDemoFill}
                  className="px-2.5 py-1 rounded-lg bg-brand-50 border border-brand-200 text-brand-700 hover:bg-brand-100 font-bold text-[11px] flex items-center gap-1 shadow-sm transition-all"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Quick Demo Fill
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="p-1 rounded-lg hover:bg-slate-200 text-slate-500 text-xs"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateOpportunity} className="p-6 overflow-y-auto space-y-4 text-xs">
              {createOppSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  {createOppSuccess}
                </div>
              )}

              {createOppError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 font-medium flex items-center gap-2">
                  <AlertOctagon className="w-4 h-4 text-rose-600 flex-shrink-0" />
                  {createOppError}
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">Scholarship / Scheme Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. National Merit-cum-Means Higher Education Grant 2026"
                  value={oppForm.title}
                  onChange={(e) => setOppForm({ ...oppForm, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Provider / Department *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ministry of Education"
                    value={oppForm.provider}
                    onChange={(e) => setOppForm({ ...oppForm, provider: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Applicable State / UT *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. All India, Karnataka, Maharashtra"
                    value={oppForm.applicable_state}
                    onChange={(e) => setOppForm({ ...oppForm, applicable_state: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Opportunity Type</label>
                  <select
                    value={oppForm.opportunity_type}
                    onChange={(e) => setOppForm({ ...oppForm, opportunity_type: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                  >
                    <option value="SCHOLARSHIP">Scholarship</option>
                    <option value="FELLOWSHIP">Fellowship &amp; Research</option>
                    <option value="SUBSIDY">Fee Subsidy</option>
                    <option value="STIPEND">Internship / Stipend</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Benefit Amount (₹)</label>
                  <input
                    type="number"
                    placeholder="e.g. 50000"
                    value={oppForm.benefit_amount}
                    onChange={(e) => setOppForm({ ...oppForm, benefit_amount: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Application Closing Date</label>
                  <input
                    type="date"
                    value={oppForm.application_closing_date}
                    onChange={(e) => setOppForm({ ...oppForm, application_closing_date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Benefit Description</label>
                <input
                  type="text"
                  placeholder="e.g. ₹50,000 per year + laptop grant"
                  value={oppForm.benefit_description}
                  onChange={(e) => setOppForm({ ...oppForm, benefit_description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Official Application URL</label>
                <input
                  type="url"
                  placeholder="https://scholarships.gov.in"
                  value={oppForm.official_application_url}
                  onChange={(e) => setOppForm({ ...oppForm, official_application_url: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Short Description *</label>
                <textarea
                  rows={2}
                  required
                  placeholder="Key summary of eligibility, purpose, and financial aid..."
                  value={oppForm.short_description}
                  onChange={(e) => setOppForm({ ...oppForm, short_description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingOpp}
                  className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold shadow-md shadow-brand-500/20 flex items-center gap-1.5 transition-all disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  {creatingOpp ? 'Creating...' : 'Publish Scholarship'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

