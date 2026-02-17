import { describe, it, expect, beforeEach } from 'vitest';
import { canonicalize } from '../canonicalize';
import { sha256Hex, hashEvent } from '../hash';
import type { EventType } from '../../db/schema';

// We test the chain verification logic directly without Dexie
// by simulating the algorithm in verifyChain

interface MockEvent {
  id: string;
  vehicleId: string;
  type: EventType;
  createdAt: string;
  driverId: string;
  payload: Record<string, unknown>;
  prevHash: string | null;
  hash: string;
}

async function buildChain(eventDefs: Array<Omit<MockEvent, 'prevHash' | 'hash'>>): Promise<MockEvent[]> {
  const chain: MockEvent[] = [];
  let prevHash: string | null = null;

  for (const def of eventDefs) {
    const hash = await hashEvent(def, prevHash);
    chain.push({ ...def, prevHash, hash });
    prevHash = hash;
  }
  return chain;
}

async function verifyChainInMemory(events: MockEvent[]): Promise<{ ok: boolean; breaks: Array<{ eventId: string; reason: string }> }> {
  const breaks: Array<{ eventId: string; reason: string }> = [];
  let expectedPrevHash: string | null = null;

  for (const event of events) {
    if (event.prevHash !== expectedPrevHash) {
      breaks.push({
        eventId: event.id,
        reason: `prevHash mismatch: expected "${expectedPrevHash}", got "${event.prevHash}"`,
      });
    }

    const recomputed = await hashEvent(event, event.prevHash);
    if (recomputed !== event.hash) {
      breaks.push({
        eventId: event.id,
        reason: `hash mismatch: computed "${recomputed}", stored "${event.hash}"`,
      });
    }

    expectedPrevHash = event.hash;
  }

  return { ok: breaks.length === 0, breaks };
}

describe('verifyChain (in-memory)', () => {
  it('validates a correct chain', async () => {
    const chain = await buildChain([
      { id: '1', vehicleId: 'CAR-01', type: 'HANDOVER', createdAt: '2024-01-01T10:00:00Z', driverId: 'd1', payload: { odometer: 100 } },
      { id: '2', vehicleId: 'CAR-01', type: 'TRIP_START', createdAt: '2024-01-01T11:00:00Z', driverId: 'd1', payload: { odometerStart: 100, fromText: 'A', purpose: 'BUSINESS' } },
      { id: '3', vehicleId: 'CAR-01', type: 'TRIP_END', createdAt: '2024-01-01T12:00:00Z', driverId: 'd1', payload: { odometerEnd: 150, toText: 'B' } },
    ]);

    const result = await verifyChainInMemory(chain);
    expect(result.ok).toBe(true);
    expect(result.breaks).toHaveLength(0);
  });

  it('detects tampered payload', async () => {
    const chain = await buildChain([
      { id: '1', vehicleId: 'CAR-01', type: 'HANDOVER', createdAt: '2024-01-01T10:00:00Z', driverId: 'd1', payload: { odometer: 100 } },
      { id: '2', vehicleId: 'CAR-01', type: 'TRIP_START', createdAt: '2024-01-01T11:00:00Z', driverId: 'd1', payload: { odometerStart: 100, fromText: 'A', purpose: 'BUSINESS' } },
    ]);

    // Tamper with the payload of event 2
    chain[1].payload = { odometerStart: 999, fromText: 'TAMPERED', purpose: 'BUSINESS' };

    const result = await verifyChainInMemory(chain);
    expect(result.ok).toBe(false);
    expect(result.breaks.length).toBeGreaterThan(0);
    expect(result.breaks.some(b => b.reason.includes('hash mismatch'))).toBe(true);
  });

  it('detects a broken prevHash link', async () => {
    const chain = await buildChain([
      { id: '1', vehicleId: 'CAR-01', type: 'HANDOVER', createdAt: '2024-01-01T10:00:00Z', driverId: 'd1', payload: { odometer: 100 } },
      { id: '2', vehicleId: 'CAR-01', type: 'TRIP_START', createdAt: '2024-01-01T11:00:00Z', driverId: 'd1', payload: { odometerStart: 100, fromText: 'A', purpose: 'BUSINESS' } },
    ]);

    // Break the prevHash link
    chain[1].prevHash = 'wrong_hash_value';

    const result = await verifyChainInMemory(chain);
    expect(result.ok).toBe(false);
    expect(result.breaks.some(b => b.reason.includes('prevHash mismatch'))).toBe(true);
  });

  it('validates an empty chain', async () => {
    const result = await verifyChainInMemory([]);
    expect(result.ok).toBe(true);
    expect(result.breaks).toHaveLength(0);
  });

  it('validates a single-event chain', async () => {
    const chain = await buildChain([
      { id: '1', vehicleId: 'CAR-01', type: 'HANDOVER', createdAt: '2024-01-01T10:00:00Z', driverId: 'd1', payload: { odometer: 100 } },
    ]);

    const result = await verifyChainInMemory(chain);
    expect(result.ok).toBe(true);
  });
});
