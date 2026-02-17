import { canonicalize } from './canonicalize';
import type { LogEvent } from '../db/schema';

/**
 * Compute SHA-256 hex digest of a string using Web Crypto API.
 */
export async function sha256Hex(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Build the canonical string for hashing an event.
 * Fields: type, createdAt, driverId, vehicleId, payload + prevHash
 */
export function buildHashInput(
  event: Pick<LogEvent, 'type' | 'createdAt' | 'driverId' | 'vehicleId' | 'payload'>,
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

/**
 * Compute the hash for an event given its data and previous hash.
 */
export async function hashEvent(
  event: Pick<LogEvent, 'type' | 'createdAt' | 'driverId' | 'vehicleId' | 'payload'>,
  prevHash: string | null,
): Promise<string> {
  const input = buildHashInput(event, prevHash);
  return sha256Hex(input);
}

/**
 * Compute SHA-256 of a Blob (for photo integrity).
 */
export async function sha256Blob(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}
