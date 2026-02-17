import { useApp } from '../app/AppContext';
import { syncEvents } from '../utils/sync';
import { useState } from 'react';

export function Header() {
  const { online, unsyncedCount, refreshUnsyncedCount } = useApp();
  const [syncing, setSyncing] = useState(false);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await syncEvents();
      await refreshUnsyncedCount();
    } finally {
      setSyncing(false);
    }
  };

  return (
    <header className="app-header">
      <h1>Car LogBook</h1>
      <div className="header-badges">
        {!online && <span className="badge badge-offline">Offline</span>}
        {online && <span className="badge badge-online">Online</span>}
        {unsyncedCount > 0 && (
          <>
            <span className="badge badge-unsynced">Unsynced: {unsyncedCount}</span>
            <button
              className="btn btn-small btn-primary"
              onClick={handleSync}
              disabled={syncing || !online}
            >
              {syncing ? 'Syncing...' : 'Sync'}
            </button>
          </>
        )}
      </div>
    </header>
  );
}
