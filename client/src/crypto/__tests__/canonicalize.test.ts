import { describe, it, expect } from 'vitest';
import { canonicalize } from '../canonicalize';

describe('canonicalize', () => {
  it('sorts object keys alphabetically', () => {
    const input = { z: 1, a: 2, m: 3 };
    const result = canonicalize(input);
    expect(result).toBe('{"a":2,"m":3,"z":1}');
  });

  it('handles nested objects with sorted keys', () => {
    const input = { b: { z: 1, a: 2 }, a: 1 };
    const result = canonicalize(input);
    expect(result).toBe('{"a":1,"b":{"a":2,"z":1}}');
  });

  it('preserves array order', () => {
    const input = { arr: [3, 1, 2] };
    const result = canonicalize(input);
    expect(result).toBe('{"arr":[3,1,2]}');
  });

  it('handles null values', () => {
    const input = { a: null, b: 1 };
    const result = canonicalize(input);
    expect(result).toBe('{"a":null,"b":1}');
  });

  it('handles empty objects', () => {
    expect(canonicalize({})).toBe('{}');
  });

  it('handles deeply nested objects', () => {
    const input = { c: { b: { a: 1 } } };
    const result = canonicalize(input);
    expect(result).toBe('{"c":{"b":{"a":1}}}');
  });

  it('produces deterministic output regardless of key insertion order', () => {
    const a = { type: 'HANDOVER', createdAt: '2024-01-01', driverId: 'd1', vehicleId: 'v1' };
    const b = { vehicleId: 'v1', driverId: 'd1', type: 'HANDOVER', createdAt: '2024-01-01' };
    expect(canonicalize(a)).toBe(canonicalize(b));
  });

  it('handles arrays of objects with sorted keys', () => {
    const input = [{ b: 2, a: 1 }, { d: 4, c: 3 }];
    const result = canonicalize(input);
    expect(result).toBe('[{"a":1,"b":2},{"c":3,"d":4}]');
  });
});
