import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  GraduationCap, Search, Sparkles, Bell, User as UserIcon,
  Menu, X, Bookmark, CheckCircle2, GitFork, Calendar, HelpCircle,
  Shield, LogOut
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface NavbarProps {
  onOpenAuth: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenAuth }) => {
  const { user, logout, profile } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'Scholarships', path: '/scholarships' },
    { name: 'Govt Schemes', path: '/schemes' },
    { name: 'Find My Eligibility', path: '/eligibility', highlight: true },
    { name: 'AI Assistant', path: '/ai-assistant', icon: Sparkles },
    { name: 'Workflow Builder', path: '/workflows' },
    { name: 'Tracker', path: '/tracker' },
    { name: 'Deadlines', path: '/deadlines' },
    { name: 'Admin Hub', path: '/admin-hub' },
  ];

  const isActive = (p: string) => {
    if (p === '/' && location.pathname !== '/') return false;
    return location.pathname.startsWith(p);
  };

  return (
    <header className="sticky top-0 z-50 glass-nav">
      {/* Top tricolor micro-stripe */}
      <div className="tricolor-stripe w-full" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-900 via-brand-700 to-saffron-500 flex items-center justify-center text-white shadow-md shadow-brand-500/20 group-hover:scale-105 transition-transform">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-xl tracking-tight text-slate-900">
                  Scholar<span className="text-brand-600">Setu</span>
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                  AI
                </span>
              </div>
              <p className="text-[10px] text-slate-500 font-medium hidden sm:block">
                Every Eligible Opportunity, One Platform
              </p>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center space-x-1">
            {navLinks.map((link) => {
              const active = isActive(link.path);
              const Icon = link.icon;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                    active
                      ? 'bg-brand-50 text-brand-700 border border-brand-200 shadow-sm'
                      : link.highlight
                      ? 'text-saffron-600 hover:bg-orange-50 font-bold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  {Icon && <Icon className="w-3.5 h-3.5 text-brand-600" />}
                  {link.name}
                </Link>
              );
            })}
          </nav>

          {/* Right Action Icons & Auth Profile */}
          <div className="flex items-center gap-2">
            {/* Notifications icon */}
            <Link
              to="/notifications"
              className="p-2 rounded-lg text-slate-600 hover:text-brand-600 hover:bg-slate-100 relative transition-colors"
              title="Notifications"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-saffron-500 rounded-full animate-ping" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-saffron-500 rounded-full" />
            </Link>

            {/* Saved bookmarks */}
            <Link
              to="/saved"
              className="p-2 rounded-lg text-slate-600 hover:text-brand-600 hover:bg-slate-100 transition-colors hidden sm:block"
              title="Saved Opportunities"
            >
              <Bookmark className="w-5 h-5" />
            </Link>

            {/* Profile or Login */}
            {user ? (
              <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                <Link
                  to="/profile"
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt="User" className="w-7 h-7 rounded-full object-cover border border-brand-300" />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-xs">
                      {user.email.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="hidden xl:block text-left leading-tight">
                    <p className="text-xs font-bold text-slate-800 truncate max-w-[100px]">
                      {profile?.full_name || user.email.split('@')[0]}
                    </p>
                    <p className="text-[10px] text-emerald-600 font-semibold">
                      {profile?.profile_completion_percentage ?? 0}% Complete
                    </p>
                  </div>
                </Link>
                <button
                  onClick={logout}
                  className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenAuth}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs shadow-md shadow-brand-500/25 transition-all active:scale-95"
              >
                <UserIcon className="w-3.5 h-3.5" />
                Sign In
              </button>
            )}

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 lg:hidden ml-1"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-white border-b border-slate-200 px-4 pt-2 pb-4 space-y-1 shadow-xl">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              onClick={() => setMobileMenuOpen(false)}
              className={`block px-3 py-2 rounded-lg text-sm font-medium ${
                isActive(link.path)
                  ? 'bg-brand-50 text-brand-700 font-bold'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              {link.name}
            </Link>
          ))}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
            <Link
              to="/help"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-1 text-xs text-slate-500 font-medium py-1"
            >
              <HelpCircle className="w-4 h-4" /> Help Center & Portals
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};
