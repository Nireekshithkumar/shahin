/**
 * ScholarSetu AI — Offline & Low-Network Resiliency Engine
 * Utilizes IndexedDB, Cache API, and Network State Listeners to support:
 * - Offline scheme browsing
 * - Saved bookmarks & cached dashboards
 * - Offline document checklists
 * - Downloadable application instructions
 * - Offline mutation queue & automatic synchronization upon reconnection
 */

import { apiClient } from './api';

const DB_NAME = 'ScholarSetuOfflineDB';
const DB_VERSION = 1;

export interface OfflinePendingChange {
  id: string;
  action: 'SAVE_OPPORTUNITY' | 'UPDATE_TRACKER_STATUS' | 'PROFILE_NOTE';
  payload: any;
  timestamp: number;
}

class OfflineService {
  private db: IDBDatabase | null = null;
  private isOnline: boolean = typeof navigator !== 'undefined' ? navigator.onLine : true;
  private listeners: Set<(online: boolean) => void> = new Set();

  constructor() {
    if (typeof window !== 'undefined') {
      this.initDB().catch((err) => {
        console.warn('[ScholarSetu Offline] Local storage initialization note:', err?.message || err);
      });
      window.addEventListener('online', () => this.handleNetworkChange(true));
      window.addEventListener('offline', () => this.handleNetworkChange(false));
    }
  }

  private handleNetworkChange(online: boolean) {
    this.isOnline = online;
    this.listeners.forEach((listener) => listener(online));
    if (online) {
      console.log('[ScholarSetu Offline] Reconnected to internet. Synchronizing pending changes...');
      this.syncPendingChanges();
    }
  }

  public subscribeNetworkStatus(callback: (online: boolean) => void): () => void {
    this.listeners.add(callback);
    callback(this.isOnline);
    return () => {
      this.listeners.delete(callback);
    };
  }

  public getOnlineStatus(): boolean {
    return this.isOnline;
  }

  private initDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      if (this.db) {
        resolve(this.db);
        return;
      }
      if (typeof window === 'undefined' || !window.indexedDB) {
        reject(new Error('IndexedDB not supported in this browser.'));
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event: any) => {
        const db = event.target.result as IDBDatabase;
        if (!db.objectStoreNames.contains('schemes')) {
          db.createObjectStore('schemes', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('bookmarks')) {
          db.createObjectStore('bookmarks', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('checklists')) {
          db.createObjectStore('checklists', { keyPath: 'opportunity_id' });
        }
        if (!db.objectStoreNames.contains('pendingChanges')) {
          db.createObjectStore('pendingChanges', { keyPath: 'id' });
        }
      };

      request.onsuccess = (event: any) => {
        this.db = event.target.result;
        resolve(this.db!);
      };

      request.onerror = (err) => {
        console.error('[ScholarSetu Offline] IndexedDB init error:', err);
        reject(err);
      };
    });
  }

  // Cache schemes for offline viewing
  public async cacheSchemes(schemes: any[]): Promise<void> {
    try {
      const db = await this.initDB();
      const tx = db.transaction('schemes', 'readwrite');
      const store = tx.objectStore('schemes');
      schemes.forEach((item) => {
        store.put({
          ...item,
          _cached_at: Date.now(),
        });
      });
    } catch (e) {
      console.warn('[ScholarSetu Offline] Failed to cache schemes to IndexedDB:', e);
    }
  }

  // Get cached schemes
  public async getCachedSchemes(): Promise<any[]> {
    try {
      const db = await this.initDB();
      return new Promise((resolve) => {
        const tx = db.transaction('schemes', 'readonly');
        const store = tx.objectStore('schemes');
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      });
    } catch {
      return [];
    }
  }

  // Cache offline document checklist
  public async cacheChecklist(opportunityId: number, checklistData: any): Promise<void> {
    try {
      const db = await this.initDB();
      const tx = db.transaction('checklists', 'readwrite');
      const store = tx.objectStore('checklists');
      store.put({
        opportunity_id: opportunityId,
        data: checklistData,
        saved_at: Date.now(),
      });
    } catch (e) {
      console.warn('[ScholarSetu Offline] Failed to cache checklist:', e);
    }
  }

  // Get cached checklist
  public async getCachedChecklist(opportunityId: number): Promise<any | null> {
    try {
      const db = await this.initDB();
      return new Promise((resolve) => {
        const tx = db.transaction('checklists', 'readonly');
        const store = tx.objectStore('checklists');
        const req = store.get(opportunityId);
        req.onsuccess = () => resolve(req.result ? req.result.data : null);
        req.onerror = () => resolve(null);
      });
    } catch {
      return null;
    }
  }

  // Queue an offline mutation
  public async queueOfflineChange(action: OfflinePendingChange['action'], payload: any): Promise<void> {
    try {
      const db = await this.initDB();
      const tx = db.transaction('pendingChanges', 'readwrite');
      const store = tx.objectStore('pendingChanges');
      const item: OfflinePendingChange = {
        id: `offline_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        action,
        payload,
        timestamp: Date.now(),
      };
      store.put(item);
    } catch (e) {
      console.warn('[ScholarSetu Offline] Failed to queue offline change:', e);
    }
  }

  // Get pending changes count
  public async getPendingChangesCount(): Promise<number> {
    try {
      const db = await this.initDB();
      return new Promise((resolve) => {
        const tx = db.transaction('pendingChanges', 'readonly');
        const store = tx.objectStore('pendingChanges');
        const req = store.count();
        req.onsuccess = () => resolve(req.result || 0);
        req.onerror = () => resolve(0);
      });
    } catch {
      return 0;
    }
  }

  // Synchronize queued changes when back online
  public async syncPendingChanges(): Promise<{ synced: number; failed: number }> {
    if (!this.isOnline) return { synced: 0, failed: 0 };
    try {
      const db = await this.initDB();
      const tx = db.transaction('pendingChanges', 'readwrite');
      const store = tx.objectStore('pendingChanges');
      const req = store.getAll();

      return new Promise((resolve) => {
        req.onsuccess = async () => {
          const items: OfflinePendingChange[] = req.result || [];
          let synced = 0;
          let failed = 0;

          for (const item of items) {
            try {
              // Execute corresponding API calls
              if (item.action === 'SAVE_OPPORTUNITY') {
                await apiClient.post('/applications/saved/', {
                  opportunity: item.payload.opportunityId,
                  notes: item.payload.notes,
                });
              } else if (item.action === 'UPDATE_TRACKER_STATUS') {
                await apiClient.patch(`/applications/tracker/${item.payload.trackerId}/`, {
                  status: item.payload.status,
                });
              }
              // Delete item from queue once synced
              const deleteTx = db.transaction('pendingChanges', 'readwrite');
              deleteTx.objectStore('pendingChanges').delete(item.id);
              synced++;
            } catch (err) {
              console.error('[ScholarSetu Offline] Error syncing offline change item:', item, err);
              failed++;
            }
          }
          resolve({ synced, failed });
        };
        req.onerror = () => resolve({ synced: 0, failed: 0 });
      });
    } catch {
      return { synced: 0, failed: 0 };
    }
  }

  // Download application checklist and instructions as printable text file
  public downloadChecklistFile(schemeTitle: string, checklist: string[], requirements: string[]): void {
    const lines = [
      '========================================================================',
      `SCHOLARSETU AI — OFFICIAL APPLICATION CHECKLIST & INSTRUCTIONS`,
      `Scheme: ${schemeTitle}`,
      `Downloaded: ${new Date().toLocaleString('en-IN')}`,
      '========================================================================',
      '',
      '1. REQUIRED DOCUMENTS CHECKLIST:',
      ...requirements.map((r, i) => `   [ ] ${i + 1}. ${r}`),
      '',
      '2. STEP-BY-STEP APPLICATION INSTRUCTIONS:',
      ...checklist.map((c, i) => `   Step ${i + 1}: ${c}`),
      '',
      '------------------------------------------------------------------------',
      'IMPORTANT GOVERNMENT GUIDELINES:',
      '- Ensure your Aadhaar is seeded with your bank account in the NPCI mapper.',
      '- Income certificate must be valid for the current academic session.',
      '- Final application submission must be completed on the official portal.',
      '========================================================================',
    ];

    const content = lines.join('\n');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ScholarSetu_Checklist_${schemeTitle.replace(/[^a-zA-Z0-9]/g, '_')}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

export const offlineService = new OfflineService();
