import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { AuthModal } from './components/layout/AuthModal';

import { HomePage } from './pages/HomePage';
import { ScholarshipsPage } from './pages/ScholarshipsPage';
import { GovernmentSchemesPage } from './pages/GovernmentSchemesPage';
import { EligibilityCheckerPage } from './pages/EligibilityCheckerPage';
import { AIAssistantPage } from './pages/AIAssistantPage';
import { WorkflowBuilderPage } from './pages/WorkflowBuilderPage';
import { ApplicationTrackerPage } from './pages/ApplicationTrackerPage';
import { SavedOpportunitiesPage } from './pages/SavedOpportunitiesPage';
import { DeadlinesPage } from './pages/DeadlinesPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { ProfilePage } from './pages/ProfilePage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { HelpCenterPage } from './pages/HelpCenterPage';

// Nine Innovative AI Feature Pages
import { DocumentReadinessPage } from './pages/DocumentReadinessPage';
import { BenefitCalculatorPage } from './pages/BenefitCalculatorPage';
import { FamilyDiscoveryPage } from './pages/FamilyDiscoveryPage';
import { RejectionAnalyzerPage } from './pages/RejectionAnalyzerPage';

import { ShieldAlert, Lock, ArrowLeft } from 'lucide-react';

const queryClient = new QueryClient();

// Strict Frontend Admin Route Protection
const AdminRoute: React.FC<{ children: React.ReactNode; onOpenAuth: () => void }> = ({
  children,
  onOpenAuth,
}) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-300 border-t-amber-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || user.role !== 'ADMIN') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center animate-fade-in">
        <div className="w-16 h-16 rounded-3xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto mb-4 shadow-sm">
          <ShieldAlert className="w-8 h-8 text-rose-600" />
        </div>
        <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-300">
          HTTP 403 Forbidden
        </span>
        <h1 className="text-2xl font-black text-slate-900 mt-4 mb-2">
          Administrator Access Required
        </h1>
        <p className="text-xs text-slate-600 max-w-md mx-auto mb-6 leading-relaxed">
          The requested Administrative Operations Hub is restricted exclusively to authorized platform administrators. Normal citizen accounts cannot access or perform administrative operations.
        </p>

        <div className="flex items-center justify-center gap-3">
          <a
            href="/"
            className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors inline-flex items-center gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" /> Return to Citizen Portal
          </a>
          <button
            onClick={onOpenAuth}
            className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-400 text-xs font-bold transition-colors inline-flex items-center gap-1.5 shadow-md"
          >
            <Lock className="w-4 h-4" /> Sign In as Administrator
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export const AppContent: React.FC = () => {
  const [authModalOpen, setAuthModalOpen] = useState(false);

  return (
    <BrowserRouter>
      <div className="flex flex-col min-h-screen bg-slate-50 text-slate-900 font-sans">
        <Navbar onOpenAuth={() => setAuthModalOpen(true)} />

        <main className="flex-1">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/scholarships" element={<ScholarshipsPage />} />
            <Route path="/schemes" element={<GovernmentSchemesPage />} />
            <Route path="/eligibility" element={<EligibilityCheckerPage />} />
            <Route path="/ai-assistant" element={<AIAssistantPage />} />
            <Route path="/workflows" element={<WorkflowBuilderPage />} />
            <Route path="/tracker" element={<ApplicationTrackerPage />} />
            <Route path="/saved" element={<SavedOpportunitiesPage />} />
            <Route path="/deadlines" element={<DeadlinesPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/profile" element={<ProfilePage />} />

            {/* Nine Innovative AI Features Routes */}
            <Route path="/document-readiness" element={<DocumentReadinessPage />} />
            <Route path="/benefit-calculator" element={<BenefitCalculatorPage />} />
            <Route path="/family-discovery" element={<FamilyDiscoveryPage />} />
            <Route path="/rejection-analyzer" element={<RejectionAnalyzerPage />} />

            {/* Admin Hub with strict RBAC Route Guard */}
            <Route
              path="/admin-hub"
              element={
                <AdminRoute onOpenAuth={() => setAuthModalOpen(true)}>
                  <AdminDashboardPage />
                </AdminRoute>
              }
            />

            <Route path="/help" element={<HelpCenterPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>

        <Footer />

        <AuthModal
          isOpen={authModalOpen}
          onClose={() => setAuthModalOpen(false)}
        />
      </div>
    </BrowserRouter>
  );
};

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
