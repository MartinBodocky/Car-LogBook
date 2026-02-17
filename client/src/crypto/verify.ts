import { db } from '../db/database';
import { hashEvent } from './hash';
import type { LogEvent } from '../db/schema';

export interface ChainBreak {
  eventId: string;
  reason: string;
}

export interface VerifyResult {
  ok: boolean;
  breaks: ChainBreak[];
}

/**
 * Verify the hash-chain integrity for a given vehicle.
 * Walks events in chronological order (createdAt) and validates each hash.
 */
export async function verifyChain(vehicleId: string): Promise<VerifyResult> {
  const events = await db.events
    .where('vehicleId')
    .equals(vehicleId)
    .sortBy('createdAt');

  const breaks: ChainBreak[] = [];
  let expectedPrevHash: string | null = null;

  for (const event of events) {
    // Check prevHash matches expected
    if (event.prevHash !== expectedPrevHash) {
      breaks.push({
        eventId: event.id,
        reason: `prevHash mismatch: expected "${expectedPrevHash ?? '(null)'}", got "${event.prevHash ?? '(null)'}"`,
      });
    }

    // Recompute hash and compare
    const recomputed = await hashEvent(event, event.prevHash);
    if (recomputed !== event.hash) {
      breaks.push({
        eventId: event.id,
        reason: `hash mismatch: computed "${recomputed}", stored "${event.hash}" — possible tampering`,
      });
    }

    expectedPrevHash = event.hash;
  }

  return { ok: breaks.length === 0, breaks };
}
