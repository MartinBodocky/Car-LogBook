import { createHash } from 'crypto';

/**
 * Recursively sorts object keys to produce stable canonical JSON.
 */
export function canonicalize(value: unknown): string {
  return JSON.stringify(sortKeys(value));
}

function sortKeys(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map(sortKeys);
  if (typeof value === 'object') {
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      sorted[key] = sortKeys((value as Record<string, unknown>)[key]);
    }
    return sorted;
  }
  return value;
}

export function sha256Hex(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

export function buildHashInput(
  event: { type: string; createdAt: string; driverId: string; vehicleId: string; payload: unknown },
  prevHash: string | null,
): string {
  const canonical = canonicalize({
    type: event.type,
    createdAt: event.createdAt,
    driverId: event.driverId,
    vehicleId: event.vehicleId,
    payload: event.payload,
    prevHash: prevHash,
  });
  return canonical + '|' + (prevHash ?? '');
}

export function computeHash(
  event: { type: string; createdAt: string; driverId: string; vehicleId: string; payload: unknown },
  prevHash: string | null,
): string {
  return sha256Hex(buildHashInput(event, prevHash));
}
