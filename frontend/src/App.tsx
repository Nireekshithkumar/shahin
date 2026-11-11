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
        <div className="w-8 h-8 border-2 border-[#D2D2D4] border-t-[#FF634A] rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || user.role !== 'ADMIN') {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center text-[#000000]">
        <div className="w-14 h-14 rounded-xl bg-[#E7E7E7] border border-[#D2D2D4] text-[#000000] flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-7 h-7 text-[#FF634A]" />
        </div>
        <span className="px-3 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider bg-[#000000] text-[#FFFFFF]">
          HTTP 403 Forbidden
        </span>
        <h1 className="text-xl font-bold text-[#000000] mt-4 mb-2 tracking-tight">
          Administrator Privileges Required
        </h1>
        <p className="text-xs text-[#000000]/70 max-w-md mx-auto mb-6 leading-relaxed">
          The requested Administrative Operations Hub is restricted exclusively to authorized platform administrators. Citizen accounts cannot view or modify administrative records.
        </p>

        <div className="flex items-center justify-center gap-3">
          <a
            href="/"
            className="px-4 py-2 rounded-lg bg-[#E7E7E7] hover:bg-[#D2D2D4] border border-[#D2D2D4] text-[#000000] text-xs font-bold transition-colors inline-flex items-center gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" /> Return to Citizen Portal
          </a>
          <button
            onClick={onOpenAuth}
            className="px-4 py-2 rounded-lg bg-[#FF634A] hover:bg-[#E5533D] text-[#FFFFFF] text-xs font-bold transition-colors inline-flex items-center gap-1.5"
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
