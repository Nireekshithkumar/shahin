import { apiClient } from './api';
import {
  User, UserProfile, Opportunity, EligibilityResult, RecommendationItem,
  ApplicationTrackerItem, SavedOpportunityItem, NotificationItem,
  ChatMessageItem, WorkflowItem
} from '../types';

export const authService = {
  async register(data: { email: string; password: string; full_name?: string }) {
    const res = await apiClient.post('/auth/register/', data);
    return res.data;
  },
  async login(data: { email: string; password: string }) {
    const res = await apiClient.post('/auth/login/', data);
    return res.data;
  },
  async getMe(): Promise<User> {
    const res = await apiClient.get('/auth/me/');
    return res.data;
  },
  async googleAuth(credential: string) {
    const res = await apiClient.post('/auth/google/', { credential });
    return res.data;
  },
};

export const profileService = {
  async getProfile(): Promise<UserProfile> {
    const res = await apiClient.get('/profile/');
    return res.data;
  },
  async updateProfile(data: Partial<UserProfile>): Promise<UserProfile> {
    const res = await apiClient.patch('/profile/', data);
    return res.data;
  },
};

export const opportunityService = {
  async getOpportunities(params: Record<string, any> = {}): Promise<{ count: number; results: Opportunity[] }> {
    const res = await apiClient.get('/opportunities/', { params });
    // Handle paginated or plain array
    if (Array.isArray(res.data)) {
      return { count: res.data.length, results: res.data };
    }
    return res.data;
  },
  async getOpportunityById(id: number | string): Promise<Opportunity> {
    const res = await apiClient.get(`/opportunities/${id}/`);
    return res.data;
  },
  async getFeatured(): Promise<Opportunity[]> {
    const res = await apiClient.get('/opportunities/featured/');
    return Array.isArray(res.data) ? res.data : res.data.results || [];
  },
  async getClosingSoon(): Promise<Opportunity[]> {
    const res = await apiClient.get('/opportunities/closing-soon/');
    return Array.isArray(res.data) ? res.data : res.data.results || [];
  },
  async getRecent(): Promise<Opportunity[]> {
    const res = await apiClient.get('/opportunities/recent/');
    return Array.isArray(res.data) ? res.data : res.data.results || [];
  },
  async getSources(): Promise<any[]> {
    const res = await apiClient.get('/opportunities/sources/');
    return Array.isArray(res.data) ? res.data : res.data.results || [];
  },
  async getViewed(): Promise<any[]> {
    const res = await apiClient.get('/opportunities/viewed/');
    return Array.isArray(res.data) ? res.data : res.data.results || [];
  },
  async getDeadlines(id: number | string): Promise<any[]> {
    const res = await apiClient.get(`/opportunities/${id}/deadlines/`);
    return Array.isArray(res.data) ? res.data : res.data.results || [];
  },
  async createOpportunity(data: any): Promise<Opportunity> {
    const res = await apiClient.post('/opportunities/', data);
    return res.data;
  },
};

export const eligibilityService = {
  async evaluate(data: { opportunity_id?: number; custom_input?: Record<string, any> }): Promise<any> {
    const res = await apiClient.post('/eligibility/evaluate/', data);
    return res.data;
  },
  async getResults(): Promise<EligibilityResult[]> {
    const res = await apiClient.get('/eligibility/results/');
    return res.data;
  },
};

export const recommendationService = {
  async getRecommendations(): Promise<RecommendationItem[]> {
    const res = await apiClient.get('/recommendations/');
    return res.data;
  },
};

export const applicationService = {
  async getSaved(): Promise<SavedOpportunityItem[]> {
    const res = await apiClient.get('/applications/saved/');
    return Array.isArray(res.data) ? res.data : res.data.results || [];
  },
  async saveOpportunity(opportunityId: number, notes = ''): Promise<SavedOpportunityItem> {
    const res = await apiClient.post('/applications/saved/', { opportunity: opportunityId, notes });
    return res.data;
  },
  async removeSaved(id: number) {
    const res = await apiClient.delete(`/applications/saved/${id}/`);
    return res.data;
  },
  async getTrackers(): Promise<ApplicationTrackerItem[]> {
    const res = await apiClient.get('/applications/trackers/');
    return Array.isArray(res.data) ? res.data : res.data.results || [];
  },
  async createTracker(data: Partial<ApplicationTrackerItem>): Promise<ApplicationTrackerItem> {
    const res = await apiClient.post('/applications/trackers/', data);
    return res.data;
  },
  async updateTracker(id: number, data: Partial<ApplicationTrackerItem>): Promise<ApplicationTrackerItem> {
    const res = await apiClient.patch(`/applications/trackers/${id}/`, data);
    return res.data;
  },
  async deleteTracker(id: number) {
    const res = await apiClient.delete(`/applications/trackers/${id}/`);
    return res.data;
  },
};

export const aiAssistantService = {
  async sendMessage(message: string, conversationId?: string) {
    const res = await apiClient.post('/ai/chat/', { message, conversation_id: conversationId });
    return res.data;
  },
  async getConversations() {
    const res = await apiClient.get('/ai/conversations/');
    return res.data;
  },
  async getConversationDetail(id: string) {
    const res = await apiClient.get(`/ai/conversations/${id}/`);
    return res.data;
  },
};

export const workflowService = {
  async getWorkflows(): Promise<WorkflowItem[]> {
    const res = await apiClient.get('/workflows/');
    return Array.isArray(res.data) ? res.data : res.data.results || [];
  },
  async saveWorkflow(data: Partial<WorkflowItem>): Promise<WorkflowItem> {
    const res = await apiClient.post('/workflows/', data);
    return res.data;
  },
  async updateWorkflow(id: number, data: Partial<WorkflowItem>): Promise<WorkflowItem> {
    const res = await apiClient.put(`/workflows/${id}/`, data);
    return res.data;
  },
  async executeWorkflow(id: number, inputData: Record<string, any>) {
    const res = await apiClient.post(`/workflows/${id}/execute/`, { input_data: inputData });
    return res.data;
  },
  async executeDirect(workflowDef: { nodes: any[]; edges: any[] }, inputData: Record<string, any>) {
    const res = await apiClient.post('/workflows/execute-direct/', {
      nodes: workflowDef.nodes,
      edges: workflowDef.edges,
      input_data: inputData,
    });
    return res.data;
  },
};

export const notificationService = {
  async getNotifications(params: { unread_only?: boolean; page?: number } = {}): Promise<{ unread_count: number; notifications: NotificationItem[]; count?: number }> {
    const res = await apiClient.get('/notifications/', { params });
    // In DRF standard pagination, results are in res.data.results
    if (res.data && res.data.results) {
      return {
        unread_count: res.data.results.unread_count || 0,
        notifications: res.data.results.notifications || [],
        count: res.data.count,
      };
    }
    return {
      unread_count: res.data.unread_count || 0,
      notifications: res.data.notifications || [],
    };
  },
  async markRead(id: number) {
    const res = await apiClient.patch(`/notifications/${id}/read/`);
    return res.data;
  },
  async markAllRead() {
    const res = await apiClient.patch('/notifications/');
    return res.data;
  },
  async getPreferences(): Promise<any> {
    const res = await apiClient.get('/notifications/preferences/');
    return res.data;
  },
  async updatePreferences(data: any): Promise<any> {
    const res = await apiClient.patch('/notifications/preferences/', data);
    return res.data;
  },
  async getEmailHistory(params: { page?: number } = {}): Promise<{ count: number; results: any[] }> {
    const res = await apiClient.get('/notifications/email-history/', { params });
    if (Array.isArray(res.data)) {
      return { count: res.data.length, results: res.data };
    }
    return res.data;
  },
  async sendTestEmail(email?: string): Promise<{ message: string; delivery_status: string; recipient?: string; error_message?: string }> {
    const res = await apiClient.post('/notifications/test-email/', email ? { email } : {});
    return res.data;
  },
  async sendVerificationEmail(): Promise<{ message: string }> {
    const res = await apiClient.post('/auth/send-verification-email/');
    return res.data;
  },
  async verifyEmail(token: string): Promise<{ message: string; is_email_verified: boolean }> {
    const res = await apiClient.post('/auth/verify-email/', { token });
    return res.data;
  },
  async requestPasswordReset(email: string): Promise<{ message: string }> {
    const res = await apiClient.post('/auth/request-password-reset/', { email });
    return res.data;
  },
  async resetPassword(token: string, new_password: string): Promise<{ message: string }> {
    const res = await apiClient.post('/auth/reset-password/', { token, new_password });
    return res.data;
  },
  async getOpportunitySubscription(opportunityId: number) {
    const res = await apiClient.get(`/opportunities/${opportunityId}/notification-settings/`);
    return res.data;
  },
  async subscribeOpportunity(opportunityId: number, data: { notify_deadline?: boolean; notify_changes?: boolean } = {}) {
    const res = await apiClient.post(`/opportunities/${opportunityId}/subscribe/`, data);
    return res.data;
  },
  async unsubscribeOpportunity(opportunityId: number) {
    const res = await apiClient.delete(`/opportunities/${opportunityId}/subscribe/`);
    return res.data;
  },
  async verifyUnsubscribeToken(token: string) {
    const res = await apiClient.get('/notifications/unsubscribe/', { params: { token } });
    return res.data;
  },
  async publicUnsubscribe(token: string, all = true, preferences = {}) {
    const res = await apiClient.post('/notifications/unsubscribe/', { token, all, preferences });
    return res.data;
  },
};

export const adminService = {
  async getDashboardStats() {
    const res = await apiClient.get('/admin-hub/dashboard/');
    return res.data;
  },
  async importFile(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    const res = await apiClient.post('/admin-hub/opportunities/import/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },
  async verifyOpportunity(id: number) {
    const res = await apiClient.post(`/admin-hub/opportunities/${id}/verify/`);
    return res.data;
  },
  async syncSource(id: number) {
    const res = await apiClient.post(`/admin-hub/sources/${id}/sync/`);
    return res.data;
  },
  async getNotificationStats() {
    const res = await apiClient.get('/notifications/admin/stats/');
    return res.data;
  },
  async getDeliveryLogs(params: Record<string, any> = {}) {
    const res = await apiClient.get('/notifications/admin/logs/', { params });
    return res.data;
  },
  async retryEmail(logId: number) {
    const res = await apiClient.post(`/notifications/admin/retry/${logId}/`);
    return res.data;
  },
  async previewTemplate(templateType: string) {
    const res = await apiClient.get(`/notifications/admin/templates/${templateType}/preview/`);
    return res.data;
  },
};

