import { db } from './database';
import { hashEvent } from '../crypto/hash';
import type { LogEvent, EventType } from './schema';

/**
 * Get the last event hash for a vehicle (for chain continuity).
 */
async function getLastHash(vehicleId: string): Promise<string | null> {
  const events = await db.events
    .where('vehicleId')
    .equals(vehicleId)
    .sortBy('createdAt');
  if (events.length === 0) return null;
  return events[events.length - 1].hash;
}

/**
 * Create and persist a new event with hash-chain integrity.
 */
export async function createEvent(
  vehicleId: string,
  type: EventType,
  driverId: string,
  payload: Record<string, unknown>,
): Promise<LogEvent> {
  const prevHash = await getLastHash(vehicleId);
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  const eventData = { type, createdAt, driverId, vehicleId, payload };
  const hash = await hashEvent(eventData, prevHash);

  const event: LogEvent = {
    id,
    vehicleId,
    type,
    createdAt,
    driverId,
    payload,
    prevHash,
    hash,
    syncStatus: 'LOCAL_ONLY',
  };

  await db.events.add(event);
  return event;
}

/**
 * Get all events for a vehicle, ordered by createdAt.
 */
export async function getVehicleEvents(vehicleId: string): Promise<LogEvent[]> {
  return db.events.where('vehicleId').equals(vehicleId).sortBy('createdAt');
}

/**
 * Get count of unsynced events.
 */
export async function getUnsyncedCount(): Promise<number> {
  return db.events.where('syncStatus').anyOf(['LOCAL_ONLY', 'FAILED']).count();
}

/**
 * Get all unsynced events ordered by createdAt.
 */
export async function getUnsyncedEvents(): Promise<LogEvent[]> {
  const events = await db.events
    .where('syncStatus')
    .anyOf(['LOCAL_ONLY', 'FAILED'])
    .toArray();
  return events.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

/**
 * Mark events as synced.
 */
export async function markEventsSynced(
  mappings: Array<{ localId: string; serverId: string }>,
): Promise<void> {
  await db.transaction('rw', db.events, async () => {
    for (const { localId, serverId } of mappings) {
      await db.events.update(localId, {
        syncStatus: 'SYNCED',
        serverId,
      });
    }
  });
}

/**
 * Mark events as failed.
 */
export async function markEventsFailed(eventIds: string[]): Promise<void> {
  await db.transaction('rw', db.events, async () => {
    for (const id of eventIds) {
      await db.events.update(id, { syncStatus: 'FAILED' });
    }
  });
}
