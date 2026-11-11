import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Shield, Bell, User as UserIcon, Menu, X, Bookmark,
  LogOut, FileCheck2, Calculator, Users2, Mic, CheckCircle,
  HelpCircle, Compass, Layers, Clock
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface NavbarProps {
  onOpenAuth: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenAuth }) => {
  const { user, logout, profile } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const isAdmin = user?.role === 'ADMIN';

  const citizenNavLinks = [
    { name: 'Home', path: '/' },
    { name: 'Scholarships', path: '/scholarships' },
    { name: 'Govt Schemes', path: '/schemes' },
    { name: 'Eligibility', path: '/eligibility' },
    { name: 'Voice AI', path: '/ai-assistant', icon: Mic },
    { name: 'Doc Checker', path: '/document-readiness', icon: FileCheck2 },
    { name: 'Benefit Calc', path: '/benefit-calculator', icon: Calculator },
    { name: 'Tracker', path: '/tracker' },
    { name: 'Family Schemes', path: '/family-discovery', icon: Users2 },
    { name: 'Deadlines', path: '/deadlines' },
  ];

  const adminNavLinks = [
    { name: 'Admin Hub', path: '/admin-hub', icon: Shield },
    { name: 'Scholarships', path: '/scholarships' },
    { name: 'Govt Schemes', path: '/schemes' },
    { name: 'Workflow Engine', path: '/workflows' },
  ];

  const navLinks = isAdmin ? adminNavLinks : citizenNavLinks;

  const isActive = (p: string) => {
    if (p === '/' && location.pathname !== '/') return false;
    return location.pathname.startsWith(p);
  };

  return (
    <header className="sticky top-0 z-50 bg-[#F4F4F6] border-b border-[#D2D2D4]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-md bg-[#000000] text-[#FFFFFF] flex items-center justify-center font-bold text-sm tracking-tight border border-[#D2D2D4] relative">
              <span>SS</span>
              <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-[#FF634A]" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-base tracking-tight text-[#000000]">
                  ScholarSetu
                </span>
                {isAdmin ? (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#000000] text-[#FFFFFF]">
                    ADMIN
                  </span>
                ) : (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#E7E7E7] text-[#000000] border border-[#D2D2D4]">
                    GOVTECH
                  </span>
                )}
              </div>
              <span className="text-[10px] text-[#000000]/60 hidden sm:block font-medium">
                National Discovery Platform
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-1">
            {navLinks.map((link) => {
              const active = isActive(link.path);
              const Icon = link.icon;
              return (
                <Link
                  key={link.name}
                  to={link.path}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
                    active
                      ? 'bg-[#FF634A]/10 text-[#FF634A] border border-[#FF634A]/30 font-semibold'
                      : 'text-[#000000]/80 hover:text-[#000000] hover:bg-[#E7E7E7]'
                  }`}
                >
                  {Icon && <Icon className="w-3.5 h-3.5" />}
                  {link.name}
                </Link>
              );
            })}
          </nav>

          {/* Right Action Controls */}
          <div className="flex items-center gap-2">
            {/* Notifications */}
            <Link
              to="/notifications"
              className="p-2 rounded-md text-[#000000]/80 hover:text-[#000000] hover:bg-[#E7E7E7] relative transition-colors"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-[#FF634A] rounded-full" />
            </Link>

            {/* Saved Bookmarks */}
            {!isAdmin && (
              <Link
                to="/saved"
                className="p-2 rounded-md text-[#000000]/80 hover:text-[#000000] hover:bg-[#E7E7E7] transition-colors hidden sm:block"
                title="Saved Opportunities"
              >
                <Bookmark className="w-4 h-4" />
              </Link>
            )}

            {/* Profile or Sign In */}
            {user ? (
              <div className="flex items-center gap-2 pl-2 border-l border-[#D2D2D4]">
                <Link
                  to={isAdmin ? '/admin-hub' : '/profile'}
                  className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-[#E7E7E7] transition-colors"
                >
                  <div className="w-7 h-7 rounded-md bg-[#000000] text-[#FFFFFF] flex items-center justify-center font-bold text-xs border border-[#D2D2D4]">
                    {user.email.charAt(0).toUpperCase()}
                  </div>
                  <div className="hidden xl:block text-left leading-tight">
                    <p className="text-xs font-bold text-[#000000] truncate max-w-[120px]">
                      {isAdmin ? 'Administrator' : (profile?.full_name || user.email.split('@')[0])}
                    </p>
                    <p className="text-[10px] text-[#000000]/60">
                      {isAdmin ? 'System Admin' : 'Citizen Account'}
                    </p>
                  </div>
                </Link>
                <button
                  onClick={logout}
                  className="p-1.5 rounded-md text-[#000000]/60 hover:text-[#FF634A] hover:bg-[#E7E7E7] transition-colors"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenAuth}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-[#FF634A] hover:bg-[#E5533D] text-[#FFFFFF] font-semibold text-xs transition-colors"
              >
                <UserIcon className="w-3.5 h-3.5" />
                Sign In
              </button>
            )}

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-md text-[#000000] hover:bg-[#E7E7E7] lg:hidden ml-1"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Panel */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-[#F4F4F6] border-b border-[#D2D2D4] px-4 pt-2 pb-4 space-y-1">
          {navLinks.map((link) => (
            <Link
              key={link.name}
              to={link.path}
              onClick={() => setMobileMenuOpen(false)}
              className={`block px-3 py-2 rounded-md text-xs font-medium ${
                isActive(link.path)
                  ? 'bg-[#FF634A]/10 text-[#FF634A] border border-[#FF634A]/30 font-semibold'
                  : 'text-[#000000]/80 hover:bg-[#E7E7E7] hover:text-[#000000]'
              }`}
            >
              {link.name}
            </Link>
          ))}
          <div className="pt-2 border-t border-[#D2D2D4]">
            <Link
              to="/help"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-1.5 text-xs text-[#000000]/60 hover:text-[#000000] py-1"
            >
              <HelpCircle className="w-4 h-4" /> Help Center & Guidelines
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};
