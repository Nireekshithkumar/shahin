import React, { useState, useEffect } from 'react';
import { User, CheckCircle2, ShieldCheck, Save, AlertCircle, Sparkles } from 'lucide-react';
import { profileService } from '../services/scholarsetuService';
import { UserProfile } from '../types';
import { useAuth } from '../context/AuthContext';

export const ProfilePage: React.FC = () => {
  const { user, profile, refreshProfile } = useAuth();
  const [formData, setFormData] = useState<Partial<UserProfile>>({});
  const [loading, setLoading] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (profile) {
      setFormData(profile);
    }
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSavedSuccess(false);
    try {
      await profileService.updateProfile(formData);
      await refreshProfile();
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const indianStates = [
    'Karnataka', 'Maharashtra', 'Uttar Pradesh', 'Tamil Nadu', 'West Bengal',
    'Kerala', 'Delhi', 'Gujarat', 'Rajasthan', 'Bihar', 'Andhra Pradesh',
    'Telangana', 'Punjab', 'Madhya Pradesh', 'Odisha', 'Assam', 'Haryana'
  ];

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <User className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-slate-800">Sign in to view your profile</h2>
      </div>
    );
  }

  const completion = profile?.profile_completion_percentage ?? 0;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header and Progress Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-lg">
              {user.email.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">{profile?.full_name || user.email}</h1>
              <p className="text-xs text-slate-500">{user.email} • Verified Citizen Account</p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-xs font-bold text-brand-700">Profile Completion: {completion}%</span>
            <div className="w-48 bg-slate-100 h-2 rounded-full overflow-hidden mt-1">
              <div
                className="bg-brand-600 h-full transition-all duration-500 rounded-full"
                style={{ width: `${completion}%` }}
              />
            </div>
          </div>
        </div>

        {profile?.missing_fields && profile.missing_fields.length > 0 && (
          <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/80 text-xs text-amber-900 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Complete your profile to unlock 100% eligibility accuracy:</p>
              <p className="text-[11px] text-amber-800 mt-0.5">
                Missing details: {profile.missing_fields.join(', ')}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Main Profile Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Personal Details */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-sm font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100">
            1. Personal & Residency Information
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Full Name</label>
              <input
                type="text"
                value={formData.full_name || ''}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                className="w-full p-2 border border-slate-200 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Age</label>
              <input
                type="number"
                value={formData.age || ''}
                onChange={(e) => setFormData({ ...formData, age: Number(e.target.value) })}
                className="w-full p-2 border border-slate-200 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">State / UT of Residence</label>
              <select
                value={formData.state_or_ut || 'Karnataka'}
                onChange={(e) => setFormData({ ...formData, state_or_ut: e.target.value })}
                className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50 text-xs"
              >
                {indianStates.map((st) => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">District</label>
              <input
                type="text"
                value={formData.district || ''}
                onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                placeholder="e.g. Bangalore Urban, Pune, Lucknow"
                className="w-full p-2 border border-slate-200 rounded-lg text-xs"
              />
            </div>
          </div>
        </div>

        {/* Education Details */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-sm font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100">
            2. Education & Academic Merit
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Current Education Level</label>
              <select
                value={formData.current_education_level || 'UNDERGRADUATE'}
                onChange={(e) => setFormData({ ...formData, current_education_level: e.target.value })}
                className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50 text-xs"
              >
                <option value="CLASS_1_10">School (Class 1-10)</option>
                <option value="CLASS_11_12">Class 11 - 12 (Higher Secondary)</option>
                <option value="DIPLOMA">Diploma</option>
                <option value="UNDERGRADUATE">Undergraduate (UG)</option>
                <option value="POSTGRADUATE">Postgraduate (PG)</option>
                <option value="PHD_RESEARCH">M.Phil / PhD / Research</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Course & Specialization</label>
              <input
                type="text"
                value={formData.course_name || ''}
                onChange={(e) => setFormData({ ...formData, course_name: e.target.value })}
                placeholder="e.g. B.Tech Computer Science, MBBS, B.Com"
                className="w-full p-2 border border-slate-200 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">College / University Name</label>
              <input
                type="text"
                value={formData.institution_name || ''}
                onChange={(e) => setFormData({ ...formData, institution_name: e.target.value })}
                className="w-full p-2 border border-slate-200 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Academic Marks / Percentage (%)</label>
              <input
                type="number"
                step="0.01"
                value={formData.academic_percentage || ''}
                onChange={(e) => setFormData({ ...formData, academic_percentage: Number(e.target.value) })}
                className="w-full p-2 border border-slate-200 rounded-lg text-xs"
              />
            </div>
          </div>
        </div>

        {/* Financial & Social Reservation */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-sm font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100">
            3. Financial Limits & Reservation Category
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Annual Family Income (₹)</label>
              <input
                type="number"
                value={formData.annual_family_income || ''}
                onChange={(e) => setFormData({ ...formData, annual_family_income: Number(e.target.value) })}
                className="w-full p-2 border border-slate-200 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Social Category</label>
              <select
                value={formData.category || 'GENERAL'}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50 text-xs"
              >
                <option value="GENERAL">General / Unreserved</option>
                <option value="OBC">Other Backward Classes (OBC)</option>
                <option value="SC">Scheduled Castes (SC)</option>
                <option value="ST">Scheduled Tribes (ST)</option>
                <option value="EWS">Economically Weaker Section (EWS)</option>
              </select>
            </div>
          </div>
        </div>

        {savedSuccess && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> Profile updated successfully! Completeness recalculated.
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-md shadow-brand-500/20 flex items-center gap-1.5 transition-all"
        >
          <Save className="w-4 h-4" />
          {loading ? 'Saving...' : 'Save Profile Changes'}
        </button>
      </form>
    </div>
  );
};
