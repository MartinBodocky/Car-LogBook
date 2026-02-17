import { describe, it, expect } from 'vitest';
import { pairTrips } from '../tripPairing';
import type { LogEvent } from '../../db/schema';

function makeEvent(overrides: Partial<LogEvent> & { type: LogEvent['type']; payload: Record<string, unknown> }): LogEvent {
  return {
    id: crypto.randomUUID(),
    vehicleId: 'CAR-01',
    driverId: 'driver-1',
    createdAt: new Date().toISOString(),
    prevHash: null,
    hash: 'fakehash',
    syncStatus: 'LOCAL_ONLY',
    ...overrides,
  };
}

describe('pairTrips', () => {
  it('pairs a TRIP_START with its nearest TRIP_END', () => {
    const start = makeEvent({
      type: 'TRIP_START',
      createdAt: '2024-01-01T10:00:00Z',
      payload: { odometerStart: 100, fromText: 'A', purpose: 'BUSINESS' },
    });
    const end = makeEvent({
      type: 'TRIP_END',
      createdAt: '2024-01-01T11:00:00Z',
      payload: { odometerEnd: 150, toText: 'B' },
    });

    const trips = pairTrips([start, end]);
    expect(trips).toHaveLength(1);
    expect(trips[0].km).toBe(50);
    expect(trips[0].fromText).toBe('A');
    expect(trips[0].toText).toBe('B');
    expect(trips[0].warning).toBeUndefined();
  });

  it('marks unpaired TRIP_START with warning', () => {
    const start = makeEvent({
      type: 'TRIP_START',
      createdAt: '2024-01-01T10:00:00Z',
      payload: { odometerStart: 100, fromText: 'A', purpose: 'BUSINESS' },
    });

    const trips = pairTrips([start]);
    expect(trips).toHaveLength(1);
    expect(trips[0].tripEndEvent).toBeNull();
    expect(trips[0].km).toBeNull();
    expect(trips[0].warning).toContain('missing TRIP_END');
  });

  it('marks orphaned TRIP_END with warning', () => {
    const end = makeEvent({
      type: 'TRIP_END',
      createdAt: '2024-01-01T11:00:00Z',
      payload: { odometerEnd: 150, toText: 'B' },
    });

    const trips = pairTrips([end]);
    expect(trips).toHaveLength(1);
    expect(trips[0].warning).toContain('Orphaned TRIP_END');
  });

  it('handles negative distance with warning', () => {
    const start = makeEvent({
      type: 'TRIP_START',
      createdAt: '2024-01-01T10:00:00Z',
      payload: { odometerStart: 200, fromText: 'A', purpose: 'PRIVATE' },
    });
    const end = makeEvent({
      type: 'TRIP_END',
      createdAt: '2024-01-01T11:00:00Z',
      payload: { odometerEnd: 100, toText: 'B' },
    });

    const trips = pairTrips([start, end]);
    expect(trips).toHaveLength(1);
    expect(trips[0].km).toBeNull();
    expect(trips[0].warning).toContain('Negative distance');
  });

  it('correctly pairs multiple trips in order', () => {
    const start1 = makeEvent({
      type: 'TRIP_START',
      createdAt: '2024-01-01T10:00:00Z',
      payload: { odometerStart: 100, fromText: 'A', purpose: 'BUSINESS' },
    });
    const end1 = makeEvent({
      type: 'TRIP_END',
      createdAt: '2024-01-01T11:00:00Z',
      payload: { odometerEnd: 150, toText: 'B' },
    });
    const start2 = makeEvent({
      type: 'TRIP_START',
      createdAt: '2024-01-01T14:00:00Z',
      payload: { odometerStart: 150, fromText: 'B', purpose: 'PRIVATE' },
    });
    const end2 = makeEvent({
      type: 'TRIP_END',
      createdAt: '2024-01-01T15:00:00Z',
      payload: { odometerEnd: 200, toText: 'C' },
    });

    const trips = pairTrips([start1, end1, start2, end2]);
    expect(trips).toHaveLength(2);
    expect(trips[0].km).toBe(50);
    expect(trips[1].km).toBe(50);
  });

  it('does not pair trips across different drivers', () => {
    const start = makeEvent({
      type: 'TRIP_START',
      createdAt: '2024-01-01T10:00:00Z',
      driverId: 'driver-1',
      payload: { odometerStart: 100, fromText: 'A', purpose: 'BUSINESS' },
    });
    const end = makeEvent({
      type: 'TRIP_END',
      createdAt: '2024-01-01T11:00:00Z',
      driverId: 'driver-2',
      payload: { odometerEnd: 150, toText: 'B' },
    });

    const trips = pairTrips([start, end]);
    expect(trips).toHaveLength(2); // unpaired start + orphaned end
    expect(trips.some((t) => t.warning?.includes('missing TRIP_END'))).toBe(true);
    expect(trips.some((t) => t.warning?.includes('Orphaned TRIP_END'))).toBe(true);
  });

  it('ignores HANDOVER and CORRECTION events', () => {
    const handover = makeEvent({
      type: 'HANDOVER',
      createdAt: '2024-01-01T09:00:00Z',
      payload: { odometer: 100 },
    });
    const start = makeEvent({
      type: 'TRIP_START',
      createdAt: '2024-01-01T10:00:00Z',
      payload: { odometerStart: 100, fromText: 'A', purpose: 'BUSINESS' },
    });
    const end = makeEvent({
      type: 'TRIP_END',
      createdAt: '2024-01-01T11:00:00Z',
      payload: { odometerEnd: 150, toText: 'B' },
    });

    const trips = pairTrips([handover, start, end]);
    expect(trips).toHaveLength(1);
    expect(trips[0].km).toBe(50);
  });
});
