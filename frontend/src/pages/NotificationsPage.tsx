import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Bell, Check, Settings, Mail, Clock, CheckCircle2,
  AlertTriangle, Send, RefreshCw, History,
  ShieldAlert, Sparkles, Filter, CheckCheck, Info
} from 'lucide-react';
import { notificationService } from '../services/scholarsetuService';
import { NotificationItem, UserNotificationPreference, EmailDeliveryLogItem } from '../types';
import { useAuth } from '../context/AuthContext';

// Zod Validation Schema
const preferencesSchema = z.object({
  email_notifications_enabled: z.boolean(),
  new_scholarships_enabled: z.boolean(),
  new_schemes_enabled: z.boolean(),
  personalized_matches_enabled: z.boolean(),
  include_potentially_eligible: z.boolean(),
  deadline_reminders_enabled: z.boolean(),
  saved_opportunity_alerts_enabled: z.boolean(),
  deadline_extension_alerts_enabled: z.boolean(),
  changes_alerts_enabled: z.boolean(),
  application_tracker_reminders_enabled: z.boolean(),
  weekly_digest_enabled: z.boolean(),
  renewal_reminders_enabled: z.boolean(),
  reminder_days_before: z.array(z.number()),
  deadline_day_reminder_enabled: z.boolean(),
  preferred_language: z.string().min(2),
  preferred_delivery_hour: z.number().min(0).max(23),
  preferred_timezone: z.string().min(2),
  max_emails_per_day: z.number().min(1).max(50),
});

type PreferencesFormData = z.infer<typeof preferencesSchema>;

export const NotificationsPage: React.FC = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // Tab state
  const initialTab = searchParams.get('tab') === 'preferences' ? 'preferences' :
                     searchParams.get('tab') === 'history' ? 'history' : 'notifications';
  const [activeTab, setActiveTab] = useState<'notifications' | 'preferences' | 'history'>(initialTab);

  // Notifications State
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [loadingNotifs, setLoadingNotifs] = useState(false);

  // Email Delivery History State
  const [emailLogs, setEmailLogs] = useState<EmailDeliveryLogItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Preference Form & Status
  const [loadingPrefs, setLoadingPrefs] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Test Email Status
  const [sendingTest, setSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<{ message: string; status?: string } | null>(null);

  // Verification & Unsubscribe Banner Status
  const [verifyMessage, setVerifyMessage] = useState<string | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [resendingVerification, setResendingVerification] = useState(false);
  const [resendVerificationMessage, setResendVerificationMessage] = useState<string | null>(null);
  const [unsubscribePrompt, setUnsubscribePrompt] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { isDirty, errors },
  } = useForm<PreferencesFormData>({
    resolver: zodResolver(preferencesSchema),
    defaultValues: {
      email_notifications_enabled: true,
      new_scholarships_enabled: true,
      new_schemes_enabled: true,
      personalized_matches_enabled: true,
      include_potentially_eligible: false,
      deadline_reminders_enabled: true,
      saved_opportunity_alerts_enabled: true,
      deadline_extension_alerts_enabled: true,
      changes_alerts_enabled: true,
      application_tracker_reminders_enabled: true,
      weekly_digest_enabled: true,
      renewal_reminders_enabled: true,
      reminder_days_before: [30, 14, 7, 3, 1],
      deadline_day_reminder_enabled: false,
      preferred_language: 'en',
      preferred_delivery_hour: 9,
      preferred_timezone: 'Asia/Kolkata',
      max_emails_per_day: 5,
    },
  });

  const emailNotificationsMaster = watch('email_notifications_enabled');
  const selectedIntervals = watch('reminder_days_before') || [];

  // 1. Check URL parameters for email verification or unsubscribe tokens
  useEffect(() => {
    const verifyToken = searchParams.get('verify_token');
    if (verifyToken) {
      notificationService.verifyEmail(verifyToken)
        .then((res) => {
          setVerifyMessage(res.message);
          setVerifyError(null);
        })
        .catch((err) => {
          setVerifyError(err.response?.data?.error || 'Verification link expired or invalid.');
          setVerifyMessage(null);
        });
    }

    const unsubToken = searchParams.get('unsubscribe_token');
    if (unsubToken) {
      setActiveTab('preferences');
      setUnsubscribePrompt('You arrived via an unsubscribe link. You can adjust your preferences below or turn off all notification emails.');
    }
  }, [searchParams]);

  // 2. Fetch Notifications
  const fetchNotifications = async () => {
    if (!user) return;
    setLoadingNotifs(true);
    try {
      const data = await notificationService.getNotifications({ unread_only: unreadOnly });
      setNotifications(data.notifications || []);
      setUnreadCount(data.unread_count || 0);
    } catch (err) {
      console.error('Failed to fetch notifications', err);
    } finally {
      setLoadingNotifs(false);
    }
  };

  // 3. Fetch Preferences
  const fetchPreferences = async () => {
    if (!user) return;
    setLoadingPrefs(true);
    try {
      const data: UserNotificationPreference = await notificationService.getPreferences();
      reset({
        email_notifications_enabled: data.email_notifications_enabled ?? true,
        new_scholarships_enabled: data.new_scholarships_enabled ?? true,
        new_schemes_enabled: data.new_schemes_enabled ?? true,
        personalized_matches_enabled: data.personalized_matches_enabled ?? true,
        include_potentially_eligible: data.include_potentially_eligible ?? false,
        deadline_reminders_enabled: data.deadline_reminders_enabled ?? true,
        saved_opportunity_alerts_enabled: data.saved_opportunity_alerts_enabled ?? true,
        deadline_extension_alerts_enabled: data.deadline_extension_alerts_enabled ?? true,
        changes_alerts_enabled: data.changes_alerts_enabled ?? true,
        application_tracker_reminders_enabled: data.application_tracker_reminders_enabled ?? true,
        weekly_digest_enabled: data.weekly_digest_enabled ?? true,
        renewal_reminders_enabled: data.renewal_reminders_enabled ?? true,
        reminder_days_before: data.reminder_days_before?.length ? data.reminder_days_before : [30, 14, 7, 3, 1],
        deadline_day_reminder_enabled: data.deadline_day_reminder_enabled ?? false,
        preferred_language: data.preferred_language || 'en',
        preferred_delivery_hour: data.preferred_delivery_hour ?? 9,
        preferred_timezone: data.preferred_timezone || 'Asia/Kolkata',
        max_emails_per_day: data.max_emails_per_day ?? 5,
      });
    } catch (err) {
      console.error('Failed to fetch preferences', err);
    } finally {
      setLoadingPrefs(false);
    }
  };

  // 4. Fetch Delivery History
  const fetchHistory = async () => {
    if (!user) return;
    setLoadingHistory(true);
    try {
      const res = await notificationService.getEmailHistory();
      setEmailLogs(res.results || []);
    } catch (err) {
      console.error('Failed to fetch email history', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (user) {
      if (activeTab === 'notifications') fetchNotifications();
      if (activeTab === 'preferences') fetchPreferences();
      if (activeTab === 'history') fetchHistory();
    }
  }, [user, activeTab, unreadOnly]);

  const handleMarkRead = async (id: number) => {
    try {
      await notificationService.markRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error(err);
    }
  };

  const onSavePreferences = async (formData: PreferencesFormData) => {
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    try {
      await notificationService.updatePreferences(formData);
      setSaveSuccess(true);
      reset(formData);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: any) {
      const msg = err.response?.data ? JSON.stringify(err.response.data) : 'Failed to save preferences.';
      setSaveError(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendTestEmail = async () => {
    setSendingTest(true);
    setTestResult(null);
    try {
      const res = await notificationService.sendTestEmail();
      setTestResult({ message: res.message, status: res.delivery_status });
      if (activeTab === 'history') fetchHistory();
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Failed to dispatch test email.';
      setTestResult({ message: msg, status: 'FAILED' });
    } finally {
      setSendingTest(false);
    }
  };

  const handleResendVerification = async () => {
    setResendingVerification(true);
    setResendVerificationMessage(null);
    try {
      const res = await notificationService.sendVerificationEmail();
      setResendVerificationMessage(res.message);
    } catch (err: any) {
      setResendVerificationMessage(err.response?.data?.error || 'Failed to send verification email.');
    } finally {
      setResendingVerification(false);
    }
  };

  const toggleInterval = (day: number) => {
    const current = selectedIntervals;
    let next: number[];
    if (current.includes(day)) {
      next = current.filter((d) => d !== day);
    } else {
      next = [...current, day].sort((a, b) => b - a);
    }
    setValue('reminder_days_before', next, { shouldDirty: true });
  };

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <div className="w-16 h-16 rounded-xl bg-[#E7E7E7] text-[#FF634A] flex items-center justify-center mx-auto mb-4 border border-[#D2D2D4]">
          <Bell className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-black text-black">Sign in to Manage Notifications</h2>
        <p className="text-xs text-black/70 mt-2 max-w-sm mx-auto">
          Receive official Indian scholarship deadline reminders, state scheme announcements, and personalized eligibility matches.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Verification Banners */}
      {verifyMessage && (
        <div className="mb-6 p-4 rounded-xl bg-[#E7E7E7] border border-[#FF634A] text-black text-xs font-semibold flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-[#FF634A] flex-shrink-0" />
          <div>
            <p className="font-bold">Email Verified Successfully!</p>
            <p className="text-[11px] text-black/70">{verifyMessage}</p>
          </div>
        </div>
      )}

      {verifyError && (
        <div className="mb-6 p-4 rounded-xl bg-[#E7E7E7] border border-[#FF634A] text-black text-xs font-semibold flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-[#FF634A] flex-shrink-0" />
          <p>{verifyError}</p>
        </div>
      )}

      {unsubscribePrompt && (
        <div className="mb-6 p-4 rounded-xl bg-[#E7E7E7] border border-[#D2D2D4] text-black text-xs font-medium flex items-center gap-3">
          <Info className="w-5 h-5 text-[#FF634A] flex-shrink-0" />
          <div>
            <p className="font-bold">Manage Your Subscriptions</p>
            <p className="text-[11px] text-black/70">{unsubscribePrompt}</p>
          </div>
        </div>
      )}

      {/* Unverified Email Warning */}
      {!user.is_email_verified && (
        <div className="mb-6 p-4 rounded-xl bg-[#E7E7E7] border border-[#FF634A] text-black text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-5 h-5 text-[#FF634A] flex-shrink-0" />
            <div>
              <p className="font-bold">Email Verification Required</p>
              <p className="text-[11px] text-black/70">
                To receive verified scholarship alerts and deadline reminders, please verify <strong>{user.email}</strong>.
              </p>
            </div>
          </div>
          <button
            onClick={handleResendVerification}
            disabled={resendingVerification}
            className="px-3.5 py-1.5 rounded-lg bg-[#FF634A] hover:opacity-90 text-white font-bold text-[11px] flex items-center gap-1.5 whitespace-nowrap transition-opacity"
          >
            {resendingVerification ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            {resendingVerification ? 'Sending...' : 'Resend Verification Email'}
          </button>
        </div>
      )}

      {resendVerificationMessage && (
        <div className="mb-6 p-3 rounded-lg bg-[#E7E7E7] border border-[#D2D2D4] text-black text-xs flex items-center gap-2">
          <Info className="w-4 h-4 text-[#FF634A] flex-shrink-0" />
          {resendVerificationMessage}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#FF634A] text-white">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-black tracking-tight">
                Email &amp; Notification Preferences
              </h1>
              <p className="text-xs text-black/70 mt-0.5">
                Indian scholarship deadline alerts, scheme announcements, and personalized eligibility matches.
              </p>
            </div>
          </div>
        </div>

        {/* Tab switch */}
        <div className="flex bg-[#E7E7E7] p-1 rounded-xl text-xs font-semibold self-start sm:self-auto border border-[#D2D2D4]">
          <button
            onClick={() => setActiveTab('notifications')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'notifications' ? 'bg-[#FF634A] text-white font-bold' : 'text-black/70 hover:text-black'
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            Alerts
            {unreadCount > 0 && (
              <span className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                activeTab === 'notifications' ? 'bg-white text-black' : 'bg-[#FF634A] text-white'
              }`}>
                {unreadCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('preferences')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'preferences' ? 'bg-[#FF634A] text-white font-bold' : 'text-black/70 hover:text-black'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            Preferences
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'history' ? 'bg-[#FF634A] text-white font-bold' : 'text-black/70 hover:text-black'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            Email History
          </button>
        </div>
      </div>

      {/* TAB 1: IN-APP ALERTS */}
      {activeTab === 'notifications' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[#D2D2D4]">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setUnreadOnly(!unreadOnly)}
                className={`text-xs px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1 transition-colors ${
                  unreadOnly ? 'bg-[#FF634A] text-white' : 'bg-[#E7E7E7] border border-[#D2D2D4] text-black hover:bg-[#D2D2D4]'
                }`}
              >
                <Filter className="w-3 h-3" />
                {unreadOnly ? 'Showing Unread' : 'All Notifications'}
              </button>
              {unreadCount > 0 && (
                <span className="text-xs text-black/70">
                  ({unreadCount} unread)
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs font-bold text-[#FF634A] hover:underline flex items-center gap-1"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Mark all as read
              </button>
            )}
          </div>

          {loadingNotifs ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 bg-[#E7E7E7] rounded-xl border border-[#D2D2D4] animate-pulse" />
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="bg-[#E7E7E7] rounded-xl border border-[#D2D2D4] p-12 text-center text-xs text-black/70">
              <CheckCircle2 className="w-10 h-10 text-black/40 mx-auto mb-2" />
              <p className="font-bold text-black text-sm">All caught up!</p>
              <p className="mt-1">No pending deadline alerts or new matching opportunities.</p>
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                className={`p-4 rounded-xl border bg-[#E7E7E7] flex items-start justify-between gap-3 transition-colors ${
                  n.is_read ? 'border-[#D2D2D4]' : 'border-[#FF634A]'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#F4F4F6] text-black border border-[#D2D2D4]">
                      {n.notification_type.replace(/_/g, ' ')}
                    </span>
                    <span className="text-[10px] text-black/60">
                      {new Date(n.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <h4 className="font-bold text-black text-xs mb-0.5">{n.title}</h4>
                  <p className="text-xs text-black/80 leading-relaxed">{n.message}</p>
                  {n.action_url && (
                    <Link
                      to={n.action_url}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-[#FF634A] hover:underline mt-2"
                    >
                      View Details &rarr;
                    </Link>
                  )}
                </div>

                {!n.is_read && (
                  <button
                    onClick={() => handleMarkRead(n.id)}
                    className="p-1 rounded-md text-[#FF634A] hover:bg-[#F4F4F6] text-[11px] font-semibold flex items-center gap-1 whitespace-nowrap"
                  >
                    <Check className="w-3.5 h-3.5" /> Mark read
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 2: EMAIL PREFERENCES */}
      {activeTab === 'preferences' && (
        <div className="bg-[#E7E7E7] rounded-xl border border-[#D2D2D4] p-6 sm:p-8">
          {loadingPrefs ? (
            <div className="space-y-4 animate-pulse">
              <div className="h-10 bg-[#F4F4F6] rounded-lg" />
              <div className="h-32 bg-[#F4F4F6] rounded-lg" />
              <div className="h-16 bg-[#F4F4F6] rounded-lg" />
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSavePreferences)} className="space-y-8 text-xs">
              {/* MASTER EMAIL TOGGLE */}
              <div className="p-4 rounded-xl bg-[#F4F4F6] border border-[#D2D2D4] flex items-center justify-between gap-4">
                <div>
                  <p className="font-bold text-sm text-black">Email Notifications Master Switch</p>
                  <p className="text-[11px] text-black/70 mt-0.5">
                    Send verified opportunity alerts and closing deadlines to <strong>{user.email}</strong>.
                  </p>
                </div>
                <Controller
                  name="email_notifications_enabled"
                  control={control}
                  render={({ field }) => (
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={(e) => field.onChange(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-[#D2D2D4] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-[#D2D2D4] after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#FF634A]"></div>
                    </label>
                  )}
                />
              </div>

              {/* GRANULAR CONTROLS */}
              <div className={`space-y-6 transition-opacity ${!emailNotificationsMaster ? 'opacity-50 pointer-events-none' : ''}`}>
                <div>
                  <h3 className="font-bold text-black text-sm mb-3 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#FF634A]" />
                    Opportunity Announcements &amp; Eligibility Matching
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className="p-3.5 rounded-xl border border-[#D2D2D4] bg-[#F4F4F6] hover:border-black/40 flex items-start gap-3 cursor-pointer">
                      <Controller
                        name="new_scholarships_enabled"
                        control={control}
                        render={({ field }) => (
                          <input
                            type="checkbox"
                            checked={field.value}
                            onChange={(e) => field.onChange(e.target.checked)}
                            className="mt-0.5 rounded accent-[#FF634A]"
                          />
                        )}
                      />
                      <div>
                        <p className="font-bold text-black">New Scholarships</p>
                        <p className="text-[11px] text-black/70">Alerts for verified central &amp; private scholarships.</p>
                      </div>
                    </label>

                    <label className="p-3.5 rounded-xl border border-[#D2D2D4] bg-[#F4F4F6] hover:border-black/40 flex items-start gap-3 cursor-pointer">
                      <Controller
                        name="new_schemes_enabled"
                        control={control}
                        render={({ field }) => (
                          <input
                            type="checkbox"
                            checked={field.value}
                            onChange={(e) => field.onChange(e.target.checked)}
                            className="mt-0.5 rounded accent-[#FF634A]"
                          />
                        )}
                      />
                      <div>
                        <p className="font-bold text-black">New Government Schemes</p>
                        <p className="text-[11px] text-black/70">Alerts for state &amp; central citizen welfare programs.</p>
                      </div>
                    </label>

                    <label className="p-3.5 rounded-xl border border-[#D2D2D4] bg-[#F4F4F6] hover:border-black/40 flex items-start gap-3 cursor-pointer">
                      <Controller
                        name="personalized_matches_enabled"
                        control={control}
                        render={({ field }) => (
                          <input
                            type="checkbox"
                            checked={field.value}
                            onChange={(e) => field.onChange(e.target.checked)}
                            className="mt-0.5 rounded accent-[#FF634A]"
                          />
                        )}
                      />
                      <div>
                        <p className="font-bold text-black">Personalized Eligibility Matches</p>
                        <p className="text-[11px] text-black/70">Strictly evaluated against your verified education &amp; income criteria.</p>
                      </div>
                    </label>

                    <label className="p-3.5 rounded-xl border border-[#D2D2D4] bg-[#F4F4F6] hover:border-black/40 flex items-start gap-3 cursor-pointer">
                      <Controller
                        name="include_potentially_eligible"
                        control={control}
                        render={({ field }) => (
                          <input
                            type="checkbox"
                            checked={field.value}
                            onChange={(e) => field.onChange(e.target.checked)}
                            className="mt-0.5 rounded accent-[#FF634A]"
                          />
                        )}
                      />
                      <div>
                        <p className="font-bold text-black">Include Potentially Eligible</p>
                        <p className="text-[11px] text-black/70">Receive alerts when criteria are partially matched.</p>
                      </div>
                    </label>
                  </div>
                </div>

                {/* DEADLINE REMINDERS & INTERVALS */}
                <div>
                  <h3 className="font-bold text-black text-sm mb-3 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#FF634A]" />
                    Deadline Countdown Alerts &amp; Intervals
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                    <label className="p-3.5 rounded-xl border border-[#D2D2D4] bg-[#F4F4F6] hover:border-black/40 flex items-start gap-3 cursor-pointer">
                      <Controller
                        name="deadline_reminders_enabled"
                        control={control}
                        render={({ field }) => (
                          <input
                            type="checkbox"
                            checked={field.value}
                            onChange={(e) => field.onChange(e.target.checked)}
                            className="mt-0.5 rounded accent-[#FF634A]"
                          />
                        )}
                      />
                      <div>
                        <p className="font-bold text-black">Deadline Approaching Reminders</p>
                        <p className="text-[11px] text-black/70">Interval alerts calculated at 06:00 IST.</p>
                      </div>
                    </label>

                    <label className="p-3.5 rounded-xl border border-[#D2D2D4] bg-[#F4F4F6] hover:border-black/40 flex items-start gap-3 cursor-pointer">
                      <Controller
                        name="saved_opportunity_alerts_enabled"
                        control={control}
                        render={({ field }) => (
                          <input
                            type="checkbox"
                            checked={field.value}
                            onChange={(e) => field.onChange(e.target.checked)}
                            className="mt-0.5 rounded accent-[#FF634A]"
                          />
                        )}
                      />
                      <div>
                        <p className="font-bold text-black">Saved Opportunities Closing</p>
                        <p className="text-[11px] text-black/70">Urgent alerts for bookmarked scholarships.</p>
                      </div>
                    </label>

                    <label className="p-3.5 rounded-xl border border-[#D2D2D4] bg-[#F4F4F6] hover:border-black/40 flex items-start gap-3 cursor-pointer">
                      <Controller
                        name="deadline_extension_alerts_enabled"
                        control={control}
                        render={({ field }) => (
                          <input
                            type="checkbox"
                            checked={field.value}
                            onChange={(e) => field.onChange(e.target.checked)}
                            className="mt-0.5 rounded accent-[#FF634A]"
                          />
                        )}
                      />
                      <div>
                        <p className="font-bold text-black">Deadline Extension Notices</p>
                        <p className="text-[11px] text-black/70">Instant notification when authorities extend a deadline.</p>
                      </div>
                    </label>

                    <label className="p-3.5 rounded-xl border border-[#D2D2D4] bg-[#F4F4F6] hover:border-black/40 flex items-start gap-3 cursor-pointer">
                      <Controller
                        name="changes_alerts_enabled"
                        control={control}
                        render={({ field }) => (
                          <input
                            type="checkbox"
                            checked={field.value}
                            onChange={(e) => field.onChange(e.target.checked)}
                            className="mt-0.5 rounded accent-[#FF634A]"
                          />
                        )}
                      />
                      <div>
                        <p className="font-bold text-black">Criteria &amp; Benefit Changes</p>
                        <p className="text-[11px] text-black/70">Alerts when income caps or required documents change.</p>
                      </div>
                    </label>
                  </div>

                  {/* Configurable Reminder Intervals */}
                  <div className="p-4 rounded-xl bg-[#F4F4F6] border border-[#D2D2D4]">
                    <p className="font-bold text-black mb-1">Configurable Reminder Intervals:</p>
                    <p className="text-[11px] text-black/70 mb-3">
                      Select which days prior to closing you wish to receive alerts:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {[30, 14, 7, 3, 1].map((d) => {
                        const isChecked = selectedIntervals.includes(d);
                        return (
                          <button
                            key={d}
                            type="button"
                            onClick={() => toggleInterval(d)}
                            className={`px-3.5 py-1.5 rounded-lg font-bold text-xs transition-colors ${
                              isChecked
                                ? 'bg-[#FF634A] text-white'
                                : 'bg-[#E7E7E7] text-black border border-[#D2D2D4] hover:bg-[#D2D2D4]'
                            }`}
                          >
                            {d} Days Prior {isChecked && '✓'}
                          </button>
                        );
                      })}
                      <Controller
                        name="deadline_day_reminder_enabled"
                        control={control}
                        render={({ field }) => (
                          <button
                            key="day-0"
                            type="button"
                            onClick={() => field.onChange(!field.value)}
                            className={`px-3.5 py-1.5 rounded-lg font-bold text-xs transition-colors ${
                              field.value
                                ? 'bg-[#FF634A] text-white'
                                : 'bg-[#E7E7E7] text-black border border-[#D2D2D4] hover:bg-[#D2D2D4]'
                            }`}
                          >
                            Deadline Day (Today) {field.value && '✓'}
                          </button>
                        )}
                      />
                    </div>
                  </div>
                </div>

                {/* TRACKER & DIGEST */}
                <div>
                  <h3 className="font-bold text-black text-sm mb-3 flex items-center gap-2">
                    <Mail className="w-4 h-4 text-[#FF634A]" />
                    Application Tracker &amp; Weekly Digests
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <label className="p-3.5 rounded-xl border border-[#D2D2D4] bg-[#F4F4F6] hover:border-black/40 flex items-start gap-3 cursor-pointer">
                      <Controller
                        name="application_tracker_reminders_enabled"
                        control={control}
                        render={({ field }) => (
                          <input
                            type="checkbox"
                            checked={field.value}
                            onChange={(e) => field.onChange(e.target.checked)}
                            className="mt-0.5 rounded accent-[#FF634A]"
                          />
                        )}
                      />
                      <div>
                        <p className="font-bold text-black">Tracker Reminders</p>
                        <p className="text-[11px] text-black/70">Document checklists &amp; milestones.</p>
                      </div>
                    </label>

                    <label className="p-3.5 rounded-xl border border-[#D2D2D4] bg-[#F4F4F6] hover:border-black/40 flex items-start gap-3 cursor-pointer">
                      <Controller
                        name="weekly_digest_enabled"
                        control={control}
                        render={({ field }) => (
                          <input
                            type="checkbox"
                            checked={field.value}
                            onChange={(e) => field.onChange(e.target.checked)}
                            className="mt-0.5 rounded accent-[#FF634A]"
                          />
                        )}
                      />
                      <div>
                        <p className="font-bold text-black">Weekly Digest</p>
                        <p className="text-[11px] text-black/70">Monday summary of top matches.</p>
                      </div>
                    </label>

                    <label className="p-3.5 rounded-xl border border-[#D2D2D4] bg-[#F4F4F6] hover:border-black/40 flex items-start gap-3 cursor-pointer">
                      <Controller
                        name="renewal_reminders_enabled"
                        control={control}
                        render={({ field }) => (
                          <input
                            type="checkbox"
                            checked={field.value}
                            onChange={(e) => field.onChange(e.target.checked)}
                            className="mt-0.5 rounded accent-[#FF634A]"
                          />
                        )}
                      />
                      <div>
                        <p className="font-bold text-black">Renewal Reminders</p>
                        <p className="text-[11px] text-black/70">Continuing grant annual deadlines.</p>
                      </div>
                    </label>
                  </div>
                </div>

                {/* LANGUAGE, TIMEZONE & FREQUENCY LIMIT */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                  <div>
                    <label className="block font-bold text-black mb-1">Preferred Language</label>
                    <Controller
                      name="preferred_language"
                      control={control}
                      render={({ field }) => (
                        <select
                          {...field}
                          className="w-full rounded-lg border border-[#D2D2D4] px-3 py-2 bg-[#F4F4F6] text-xs text-black focus:outline-none focus:border-[#FF634A]"
                        >
                          <option value="en">English (Default)</option>
                          <option value="hi">Hindi (हिंदी)</option>
                          <option value="kn">Kannada (ಕನ್ನಡ)</option>
                          <option value="te">Telugu (తెలుగు)</option>
                          <option value="ta">Tamil (தமிழ்)</option>
                          <option value="mr">Marathi (मराठी)</option>
                          <option value="bn">Bengali (বাংলা)</option>
                        </select>
                      )}
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-black mb-1">Digest Hour &amp; Timezone</label>
                    <div className="flex gap-2">
                      <Controller
                        name="preferred_delivery_hour"
                        control={control}
                        render={({ field }) => (
                          <select
                            value={field.value}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                            className="w-1/2 rounded-lg border border-[#D2D2D4] px-3 py-2 bg-[#F4F4F6] text-xs text-black focus:outline-none focus:border-[#FF634A]"
                          >
                            {[6, 7, 8, 9, 10, 11, 12, 16, 18, 20].map((h) => (
                              <option key={h} value={h}>
                                {h > 12 ? `${h - 12} PM` : `${h} AM`}
                              </option>
                            ))}
                          </select>
                        )}
                      />
                      <Controller
                        name="preferred_timezone"
                        control={control}
                        render={({ field }) => (
                          <input
                            {...field}
                            readOnly
                            className="w-1/2 rounded-lg border border-[#D2D2D4] px-3 py-2 bg-[#F4F4F6] text-xs text-black/70"
                          />
                        )}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-black mb-1">Max Emails Per Day</label>
                    <Controller
                      name="max_emails_per_day"
                      control={control}
                      render={({ field }) => (
                        <select
                          value={field.value}
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                          className="w-full rounded-lg border border-[#D2D2D4] px-3 py-2 bg-[#F4F4F6] text-xs text-black focus:outline-none focus:border-[#FF634A]"
                        >
                          <option value={1}>1 email / day</option>
                          <option value={3}>3 emails / day</option>
                          <option value={5}>5 emails / day (Recommended)</option>
                          <option value={10}>10 emails / day</option>
                        </select>
                      )}
                    />
                  </div>
                </div>
              </div>

              {/* FEEDBACK BANNERS */}
              {saveSuccess && (
                <div className="p-3.5 rounded-lg bg-[#F4F4F6] border border-[#FF634A] text-black font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#FF634A]" />
                  Preferences updated and verified with ScholarSetu AI backend!
                </div>
              )}

              {saveError && (
                <div className="p-3.5 rounded-lg bg-[#F4F4F6] border border-[#FF634A] text-black font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-[#FF634A]" />
                  {saveError}
                </div>
              )}

              {testResult && (
                <div className="p-3.5 rounded-lg border border-[#D2D2D4] bg-[#F4F4F6] text-xs font-semibold flex items-center gap-2 text-black">
                  <Info className="w-4 h-4 text-[#FF634A]" />
                  {testResult.message}
                </div>
              )}

              {/* ACTION BUTTONS */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-[#D2D2D4]">
                <button
                  type="button"
                  onClick={handleSendTestEmail}
                  disabled={sendingTest}
                  className="px-4 py-2.5 rounded-lg border border-[#D2D2D4] bg-[#F4F4F6] hover:bg-[#D2D2D4] text-black font-bold text-xs flex items-center gap-2 transition-colors"
                >
                  {sendingTest ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5 text-[#FF634A]" />}
                  {sendingTest ? 'Sending Test...' : 'Send Test Email'}
                </button>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2.5 rounded-lg bg-[#FF634A] hover:opacity-90 text-white font-bold text-xs flex items-center gap-2 transition-opacity"
                >
                  {isSaving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  {isSaving ? 'Saving Changes...' : 'Save Notification Preferences'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* TAB 3: EMAIL DELIVERY HISTORY */}
      {activeTab === 'history' && (
        <div className="bg-[#E7E7E7] rounded-xl border border-[#D2D2D4] p-6">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#D2D2D4]">
            <div>
              <h3 className="font-bold text-black text-sm">Email Delivery Audit Log</h3>
              <p className="text-[11px] text-black/70">History of notification messages dispatched to {user.email}.</p>
            </div>
            <button
              onClick={fetchHistory}
              disabled={loadingHistory}
              className="p-1.5 rounded-lg border border-[#D2D2D4] hover:bg-[#D2D2D4] bg-[#F4F4F6] text-black text-xs font-semibold flex items-center gap-1 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingHistory ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {loadingHistory ? (
            <div className="space-y-2 animate-pulse">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-14 bg-[#F4F4F6] rounded-xl" />
              ))}
            </div>
          ) : emailLogs.length === 0 ? (
            <div className="text-center py-12 text-black/40 text-xs">
              <Mail className="w-8 h-8 mx-auto mb-2 opacity-50" />
              No notification emails have been dispatched to your address yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#D2D2D4] text-black/60 font-bold uppercase text-[10px]">
                    <th className="pb-2">Date &amp; Time</th>
                    <th className="pb-2">Subject / Event</th>
                    <th className="pb-2">Type</th>
                    <th className="pb-2 text-right">Delivery Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D2D2D4]">
                  {emailLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-[#F4F4F6]/50 transition-colors">
                      <td className="py-3 text-black/70 whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                      <td className="py-3 pr-2">
                        <span className="font-semibold text-black block truncate max-w-sm">{log.subject}</span>
                        {log.error_message && (
                          <span className="text-[10px] text-[#FF634A] block mt-0.5 truncate max-w-sm">
                            {log.error_message}
                          </span>
                        )}
                      </td>
                      <td className="py-3 text-[11px] text-black/70 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded bg-[#F4F4F6] border border-[#D2D2D4] font-medium text-black">
                          {log.notification_type.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-3 text-right whitespace-nowrap">
                        <span
                          className={`px-2.5 py-1 rounded text-[10px] font-bold ${
                            log.status === 'SENT' || log.status === 'DELIVERED'
                              ? 'bg-[#F4F4F6] text-black border border-[#D2D2D4]'
                              : log.status === 'QUEUED'
                              ? 'bg-[#F4F4F6] text-black border border-[#D2D2D4]'
                              : log.status === 'RETRYING'
                              ? 'bg-[#F4F4F6] text-[#FF634A] border border-[#FF634A]'
                              : 'bg-[#FF634A] text-white'
                          }`}
                        >
                          {log.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
