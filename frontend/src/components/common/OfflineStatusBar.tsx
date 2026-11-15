import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi, RefreshCw, CheckCircle2 } from 'lucide-react';
import { offlineService } from '../../services/offlineService';

export const OfflineStatusBar: React.FC = () => {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncSuccessMsg, setSyncSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = offlineService.subscribeNetworkStatus((online) => {
      setIsOnline(online);
      refreshPendingCount();
    });
    refreshPendingCount();
    return () => unsubscribe();
  }, []);

  const refreshPendingCount = async () => {
    const count = await offlineService.getPendingChangesCount();
    setPendingCount(count);
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    setSyncSuccessMsg(null);
    try {
      const res = await offlineService.syncPendingChanges();
      if (res.synced > 0) {
        setSyncSuccessMsg(`Successfully synchronized ${res.synced} offline update(s).`);
        setTimeout(() => setSyncSuccessMsg(null), 4000);
      }
      await refreshPendingCount();
    } finally {
      setIsSyncing(false);
    }
  };

  if (isOnline && pendingCount === 0 && !syncSuccessMsg) {
    return null;
  }

  return (
    <div className="w-full bg-[#E7E7E7] border-b border-[#D2D2D4] px-4 py-2 text-xs flex flex-wrap items-center justify-between gap-2 text-[#000000]">
      <div className="flex items-center gap-2">
        {!isOnline ? (
          <>
            <WifiOff className="w-4 h-4 text-[#FF634A]" />
            <span className="font-bold">Offline Mode:</span>
            <span className="text-[#000000]/70">
              Viewing cached schemes &amp; checklists from local storage.
            </span>
          </>
        ) : syncSuccessMsg ? (
          <>
            <CheckCircle2 className="w-4 h-4 text-[#FF634A]" />
            <span className="font-semibold">{syncSuccessMsg}</span>
          </>
        ) : (
          <>
            <Wifi className="w-4 h-4 text-[#000000]" />
            <span>Connection restored. {pendingCount} offline update(s) pending synchronization.</span>
          </>
        )}
      </div>

      <div className="flex items-center gap-2">
        {pendingCount > 0 && isOnline && (
          <button
            type="button"
            onClick={handleManualSync}
            disabled={isSyncing}
            className="px-2.5 py-1 rounded bg-[#FF634A] text-white font-bold text-[11px] flex items-center gap-1 hover:opacity-90 disabled:opacity-50"
          >
            {isSyncing ? <RefreshCw className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
            {isSyncing ? 'Syncing...' : 'Sync Now'}
          </button>
        )}
      </div>
    </div>
  );
};

