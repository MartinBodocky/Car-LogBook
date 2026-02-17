import { describe, it, expect } from 'vitest';
import { sha256Hex, buildHashInput, hashEvent } from '../hash';

describe('sha256Hex', () => {
  it('produces a 64-char lowercase hex string', async () => {
    const result = await sha256Hex('hello');
    expect(result).toHaveLength(64);
    expect(result).toMatch(/^[0-9a-f]{64}$/);
  });

  it('produces deterministic output', async () => {
    const a = await sha256Hex('test input');
    const b = await sha256Hex('test input');
    expect(a).toBe(b);
  });

  it('produces different output for different input', async () => {
    const a = await sha256Hex('input a');
    const b = await sha256Hex('input b');
    expect(a).not.toBe(b);
  });
});

describe('buildHashInput', () => {
  it('includes prevHash in the suffix', () => {
    const event = {
      type: 'HANDOVER' as const,
      createdAt: '2024-01-01T00:00:00Z',
      driverId: 'driver-1',
      vehicleId: 'CAR-01',
      payload: { odometer: 1000 },
    };

    const result = buildHashInput(event, 'abc123');
    expect(result).toContain('|abc123');
  });

  it('uses empty string suffix when prevHash is null', () => {
    const event = {
      type: 'HANDOVER' as const,
      createdAt: '2024-01-01T00:00:00Z',
      driverId: 'driver-1',
      vehicleId: 'CAR-01',
      payload: { odometer: 1000 },
    };

    const result = buildHashInput(event, null);
    expect(result.endsWith('|')).toBe(true);
  });
});

describe('hashEvent', () => {
  it('produces deterministic hash for the same event', async () => {
    const event = {
      type: 'HANDOVER' as const,
      createdAt: '2024-01-01T00:00:00Z',
      driverId: 'driver-1',
      vehicleId: 'CAR-01',
      payload: { odometer: 1000 },
    };

    const hash1 = await hashEvent(event, null);
    const hash2 = await hashEvent(event, null);
    expect(hash1).toBe(hash2);
  });

  it('produces different hash for different payloads', async () => {
    const base = {
      type: 'HANDOVER' as const,
      createdAt: '2024-01-01T00:00:00Z',
      driverId: 'driver-1',
      vehicleId: 'CAR-01',
    };

    const hash1 = await hashEvent({ ...base, payload: { odometer: 1000 } }, null);
    const hash2 = await hashEvent({ ...base, payload: { odometer: 1001 } }, null);
    expect(hash1).not.toBe(hash2);
  });

  it('produces different hash for different prevHash', async () => {
    const event = {
      type: 'HANDOVER' as const,
      createdAt: '2024-01-01T00:00:00Z',
      driverId: 'driver-1',
      vehicleId: 'CAR-01',
      payload: { odometer: 1000 },
    };

    const hash1 = await hashEvent(event, null);
    const hash2 = await hashEvent(event, 'someprevhash');
    expect(hash1).not.toBe(hash2);
  });

  it('is independent of payload key order', async () => {
    const event1 = {
      type: 'TRIP_START' as const,
      createdAt: '2024-01-01T00:00:00Z',
      driverId: 'driver-1',
      vehicleId: 'CAR-01',
      payload: { odometerStart: 100, fromText: 'A', purpose: 'BUSINESS' },
    };

    const event2 = {
      type: 'TRIP_START' as const,
      createdAt: '2024-01-01T00:00:00Z',
      driverId: 'driver-1',
      vehicleId: 'CAR-01',
      payload: { purpose: 'BUSINESS', fromText: 'A', odometerStart: 100 },
    };

    const hash1 = await hashEvent(event1, null);
    const hash2 = await hashEvent(event2, null);
    expect(hash1).toBe(hash2);
  });
});
