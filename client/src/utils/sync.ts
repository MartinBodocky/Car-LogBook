import { getUnsyncedEvents, markEventsSynced, markEventsFailed } from '../db/events';
import { db } from '../db/database';
import type { Photo } from '../db/schema';

const API_BASE = '/api';

export interface SyncResult {
  synced: number;
  failed: number;
  errors: string[];
}

/**
 * Sync all unsynced events to the server.
 * Groups events by vehicle and sends in createdAt order.
 */
export async function syncEvents(): Promise<SyncResult> {
  const events = await getUnsyncedEvents();
  if (events.length === 0) return { synced: 0, failed: 0, errors: [] };

  const result: SyncResult = { synced: 0, failed: 0, errors: [] };

  // Group by vehicleId
  const byVehicle = new Map<string, typeof events>();
  for (const event of events) {
    const arr = byVehicle.get(event.vehicleId) || [];
    arr.push(event);
    byVehicle.set(event.vehicleId, arr);
  }

  for (const [vehicleId, vehicleEvents] of byVehicle) {
    try {
      const response = await fetch(`${API_BASE}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vehicleId, events: vehicleEvents }),
      });

      if (response.ok) {
        const data = await response.json();
        const mappings = data.accepted.map((a: { localEventId: string; serverId: string }) => ({
          localId: a.localEventId,
          serverId: a.serverId,
        }));
        await markEventsSynced(mappings);
        result.synced += mappings.length;
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        result.errors.push(`Vehicle ${vehicleId}: ${errorData.error || 'Server error'}`);
        await markEventsFailed(vehicleEvents.map((e) => e.id));
        result.failed += vehicleEvents.length;
      }
    } catch (err) {
      result.errors.push(`Vehicle ${vehicleId}: Network error — ${(err as Error).message}`);
      // Don't mark as failed for network errors — keep as LOCAL_ONLY for retry
      result.failed += vehicleEvents.length;
    }
  }

  return result;
}

/**
 * Sync photos to the server.
 */
export async function syncPhoto(photo: Photo): Promise<string | null> {
  try {
    const formData = new FormData();
    formData.append('photo', photo.data, `${photo.id}.jpg`);
    formData.append('vehicleId', photo.vehicleId);
    formData.append('photoId', photo.id);

    const response = await fetch(`${API_BASE}/photos`, {
      method: 'POST',
      body: formData,
    });

    if (response.ok) {
      const data = await response.json();
      return data.url;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Check if we're online.
 */
export function isOnline(): boolean {
  return navigator.onLine;
}
