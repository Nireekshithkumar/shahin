import React, { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
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

const queryClient = new QueryClient();

export const App: React.FC = () => {
  const [authModalOpen, setAuthModalOpen] = useState(false);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
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
                <Route path="/admin-hub" element={<AdminDashboardPage />} />
                <Route path="/help" element={<HelpCenterPage />} />
              </Routes>
            </main>

            <Footer />

            <AuthModal
              isOpen={authModalOpen}
              onClose={() => setAuthModalOpen(false)}
            />
          </div>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
