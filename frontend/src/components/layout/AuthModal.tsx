import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Lock, Mail, User as UserIcon, AlertCircle, ArrowRight, Shield, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { notificationService } from '../../services/scholarsetuService';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultAdminMode?: boolean;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, defaultAdminMode = false }) => {
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState<'citizen_login' | 'admin_login' | 'register' | 'forgot_password'>(
    defaultAdminMode ? 'admin_login' : 'citizen_login'
  );

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await notificationService.requestPasswordReset(resetEmail);
      setResetSuccess(`Password reset instructions have been dispatched to ${resetEmail}.`);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to dispatch password reset request.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === 'register') {
        await register(email, password, fullName);
        onClose();
        navigate('/profile');
      } else {
        const loggedUser = await login(email, password);
        onClose();
        if (loggedUser.role === 'ADMIN' || mode === 'admin_login') {
          navigate('/admin-hub');
        }
      }
    } catch (err: any) {
      const msg = err.response?.data?.error ||
        (err.response?.data?.email ? `Email: ${err.response.data.email[0]}` : null) ||
        (err.response?.data?.password ? `Password: ${err.response.data.password[0]}` : null) ||
        'Authentication failed. Please verify your credentials.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#000000]/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-[#F4F4F6] rounded-xl border border-[#D2D2D4] overflow-hidden shadow-xl">
        {/* Top Accent Strip */}
        <div className="h-1 w-full bg-[#FF634A]" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-md text-[#000000]/60 hover:text-[#000000] hover:bg-[#E7E7E7] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6 sm:p-8">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="w-10 h-10 mx-auto rounded-md bg-[#000000] text-[#FFFFFF] flex items-center justify-center font-bold text-sm border border-[#D2D2D4] mb-3 relative">
              {mode === 'admin_login' ? <Shield className="w-5 h-5 text-[#FF634A]" /> : <span>SS</span>}
              {mode !== 'admin_login' && <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-[#FF634A]" />}
            </div>
            <h2 className="text-lg font-bold text-[#000000] tracking-tight">
              {mode === 'admin_login' && 'Platform Administrator Authentication'}
              {mode === 'citizen_login' && 'Citizen & Student Sign In'}
              {mode === 'register' && 'Register Citizen Account'}
              {mode === 'forgot_password' && 'Password Recovery'}
            </h2>
            <p className="text-xs text-[#000000]/60 mt-1">
              {mode === 'admin_login' && 'Restricted to authorized system administrators.'}
              {mode === 'citizen_login' && 'Access verified schemes, eligibility engine, and tracker.'}
              {mode === 'register' && 'Create your citizen profile to match verified government benefits.'}
              {mode === 'forgot_password' && 'Enter your registered email to receive recovery instructions.'}
            </p>
          </div>

          {/* Mode Switcher */}
          {mode !== 'forgot_password' && (
            <div className="flex border border-[#D2D2D4] rounded-lg p-1 mb-5 bg-[#E7E7E7] text-xs font-semibold">
              <button
                type="button"
                onClick={() => { setMode('citizen_login'); setError(null); }}
                className={`flex-1 py-1.5 rounded-md transition-all ${
                  mode === 'citizen_login'
                    ? 'bg-[#FFFFFF] text-[#000000] shadow-sm'
                    : 'text-[#000000]/70 hover:text-[#000000]'
                }`}
              >
                Citizen Login
              </button>
              <button
                type="button"
                onClick={() => { setMode('admin_login'); setError(null); }}
                className={`flex-1 py-1.5 rounded-md transition-all ${
                  mode === 'admin_login'
                    ? 'bg-[#000000] text-[#FFFFFF] shadow-sm'
                    : 'text-[#000000]/70 hover:text-[#000000]'
                }`}
              >
                Admin Login
              </button>
              <button
                type="button"
                onClick={() => { setMode('register'); setError(null); }}
                className={`flex-1 py-1.5 rounded-md transition-all ${
                  mode === 'register'
                    ? 'bg-[#FFFFFF] text-[#FF634A] shadow-sm'
                    : 'text-[#000000]/70 hover:text-[#000000]'
                }`}
              >
                Register
              </button>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-[#E7E7E7] border border-[#FF634A]/40 text-[#000000] text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-[#FF634A]" />
              <span>{error}</span>
            </div>
          )}

          {resetSuccess && (
            <div className="mb-4 p-3 rounded-lg bg-[#E7E7E7] border border-[#D2D2D4] text-[#000000] text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-[#FF634A]" />
              <span>{resetSuccess}</span>
            </div>
          )}

          {/* Form */}
          {mode === 'forgot_password' ? (
            <form onSubmit={handleResetSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#000000] mb-1">Registered Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#000000]/40 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="Enter your registered email"
                    className="w-full pl-9 pr-3 py-2 text-xs bg-[#FFFFFF] border border-[#D2D2D4] rounded-md focus:border-[#FF634A] focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-md text-[#FFFFFF] font-bold text-xs bg-[#FF634A] hover:bg-[#E5533D] transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? 'Processing...' : 'Send Password Reset Email'}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => { setMode('citizen_login'); setError(null); }}
                  className="text-xs text-[#000000]/80 hover:text-[#FF634A] font-semibold"
                >
                  Return to Sign In
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'register' && (
                <div>
                  <label className="block text-xs font-bold text-[#000000] mb-1">Full Legal Name</label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 text-[#000000]/40 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Ramesh Kumar"
                      className="w-full pl-9 pr-3 py-2 text-xs bg-[#FFFFFF] border border-[#D2D2D4] rounded-md focus:border-[#FF634A] focus:outline-none"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-[#000000] mb-1">
                  {mode === 'admin_login' ? 'Administrator Email' : 'Email Address'}
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#000000]/40 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={mode === 'admin_login' ? 'admin@gamil.com' : 'you@example.com'}
                    className="w-full pl-9 pr-3 py-2 text-xs bg-[#FFFFFF] border border-[#D2D2D4] rounded-md focus:border-[#FF634A] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-bold text-[#000000]">Password</label>
                  {mode !== 'register' && (
                    <button
                      type="button"
                      onClick={() => { setMode('forgot_password'); setError(null); setResetSuccess(null); }}
                      className="text-[11px] text-[#000000]/70 hover:text-[#FF634A] font-medium"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#000000]/40 absolute left-3 top-2.5" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className="w-full pl-9 pr-3 py-2 text-xs bg-[#FFFFFF] border border-[#D2D2D4] rounded-md focus:border-[#FF634A] focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-md text-[#FFFFFF] font-bold text-xs bg-[#FF634A] hover:bg-[#E5533D] transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {loading ? (
                  <span>Authenticating...</span>
                ) : (
                  <>
                    <span>
                      {mode === 'register' && 'Create Citizen Account'}
                      {mode === 'citizen_login' && 'Sign In as Citizen'}
                      {mode === 'admin_login' && 'Access Admin Operations'}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Footer note */}
          <div className="mt-5 text-center text-[10px] text-[#000000]/50 border-t border-[#D2D2D4] pt-3">
            National Scholarship & Welfare Discovery Engine. Protected by role-based access control.
          </div>
        </div>
      </div>
    </div>
  );
};
