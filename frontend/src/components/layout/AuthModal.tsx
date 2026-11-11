import React, { useState } from 'react';
import { X, GraduationCap, Lock, Mail, User as UserIcon, AlertCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { login, register, googleLogin } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isRegister) {
        await register(email, password, fullName);
      } else {
        await login(email, password);
      }
      onClose();
    } catch (err: any) {
      const msg = err.response?.data?.error ||
        (err.response?.data?.email ? `Email: ${err.response.data.email[0]}` : null) ||
        (err.response?.data?.password ? `Password: ${err.response.data.password[0]}` : null) ||
        'Authentication failed. Please check your credentials.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (role: 'student' | 'admin') => {
    setError(null);
    setLoading(true);
    const demoEmail = role === 'admin' ? 'admin@scholarsetu.gov.in' : 'student.rohan@scholarsetu.gov.in';
    const demoPass = 'ScholarSetu@2026';
    const demoName = role === 'admin' ? 'Platform Administrator' : 'Rohan Sharma';

    try {
      // Try login first
      try {
        await login(demoEmail, demoPass);
        onClose();
        return;
      } catch (loginErr) {
        // If demo user does not exist, auto-register it!
        await register(demoEmail, demoPass, demoName);
        onClose();
      }
    } catch (err: any) {
      setError('Quick demo login error. You can sign up with any email above.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
        {/* Top saffron accent bar */}
        <div className="tricolor-stripe w-full" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6 sm:p-8">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="w-12 h-12 mx-auto rounded-xl bg-gradient-to-tr from-brand-900 via-brand-700 to-saffron-500 flex items-center justify-center text-white shadow-md mb-3">
              <GraduationCap className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">
              {isRegister ? 'Create your ScholarSetu account' : 'Welcome back to ScholarSetu'}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              {isRegister
                ? 'Save opportunities, track applications, and unlock AI recommendations'
                : 'Sign in to access your saved scholarships and eligibility engine'}
            </p>
          </div>

          {/* Quick Demo Login Pills */}
          <div className="mb-5 p-3 rounded-xl bg-brand-50/60 border border-brand-100">
            <p className="text-[11px] font-semibold text-brand-900 mb-1.5 text-center">
              One-Click Instant Demo Login:
            </p>
            <div className="flex gap-2 justify-center">
              <button
                type="button"
                onClick={() => handleDemoLogin('student')}
                disabled={loading}
                className="px-3 py-1.5 rounded-lg bg-white border border-brand-200 text-xs font-semibold text-brand-700 hover:bg-brand-50 shadow-sm transition-all"
              >
                Student Demo
              </button>
              <button
                type="button"
                onClick={() => handleDemoLogin('admin')}
                disabled={loading}
                className="px-3 py-1.5 rounded-lg bg-white border border-brand-200 text-xs font-semibold text-brand-700 hover:bg-brand-50 shadow-sm transition-all"
              >
                Admin Hub Demo
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required={isRegister}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Rohan Sharma"
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-md shadow-brand-500/20 flex items-center justify-center gap-1.5 transition-all active:scale-[0.99] disabled:opacity-50"
            >
              {loading ? 'Please wait...' : isRegister ? 'Create Account' : 'Sign In'}
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>

          {/* Toggle Tab */}
          <div className="mt-6 text-center text-xs text-slate-500">
            {isRegister ? (
              <p>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => setIsRegister(false)}
                  className="text-brand-600 font-bold hover:underline"
                >
                  Sign In
                </button>
              </p>
            ) : (
              <p>
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => setIsRegister(true)}
                  className="text-brand-600 font-bold hover:underline"
                >
                  Register Free
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
