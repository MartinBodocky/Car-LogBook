import { z } from 'zod';

// ── Vehicle ──
export const VehicleSchema = z.object({
  id: z.string(),
  label: z.string(),
});
export type Vehicle = z.infer<typeof VehicleSchema>;

// ── Driver ──
export const DriverSchema = z.object({
  id: z.string(),
  name: z.string(),
});
export type Driver = z.infer<typeof DriverSchema>;

// ── Event types ──
export const EventType = z.enum(['HANDOVER', 'TRIP_START', 'TRIP_END', 'CORRECTION']);
export type EventType = z.infer<typeof EventType>;

export const Purpose = z.enum(['BUSINESS', 'PRIVATE']);
export type Purpose = z.infer<typeof Purpose>;

export const SyncStatus = z.enum(['LOCAL_ONLY', 'SYNCED', 'FAILED']);
export type SyncStatus = z.infer<typeof SyncStatus>;

// ── Payloads ──
export const HandoverPayloadSchema = z.object({
  odometer: z.number().int().nonnegative(),
  locationText: z.string().optional(),
  odometerPhotoIds: z.array(z.string()).optional(),
});
export type HandoverPayload = z.infer<typeof HandoverPayloadSchema>;

export const TripStartPayloadSchema = z.object({
  odometerStart: z.number().int().nonnegative(),
  fromText: z.string().min(1, 'Starting location is required'),
  purpose: Purpose,
  projectOrClient: z.string().optional(),
  startPhotoIds: z.array(z.string()).optional(),
});
export type TripStartPayload = z.infer<typeof TripStartPayloadSchema>;

export const TripEndPayloadSchema = z.object({
  odometerEnd: z.number().int().nonnegative(),
  toText: z.string().min(1, 'Destination is required'),
  endPhotoIds: z.array(z.string()).optional(),
  notes: z.string().optional(),
});
export type TripEndPayload = z.infer<typeof TripEndPayloadSchema>;

export const CorrectionPayloadSchema = z.object({
  referencesEventId: z.string(),
  correctedFields: z.record(z.unknown()),
  reason: z.string().min(1, 'Reason is required'),
});
export type CorrectionPayload = z.infer<typeof CorrectionPayloadSchema>;

export const PayloadSchema = z.union([
  HandoverPayloadSchema,
  TripStartPayloadSchema,
  TripEndPayloadSchema,
  CorrectionPayloadSchema,
]);

// ── Event ──
export const EventSchema = z.object({
  id: z.string().uuid(),
  vehicleId: z.string(),
  type: EventType,
  createdAt: z.string(),
  driverId: z.string(),
  payload: z.record(z.unknown()),
  prevHash: z.string().nullable(),
  hash: z.string(),
  syncStatus: SyncStatus,
  serverId: z.string().optional(),
});
export type LogEvent = z.infer<typeof EventSchema>;

// ── Photo ──
export const PhotoSchema = z.object({
  id: z.string().uuid(),
  vehicleId: z.string(),
  createdAt: z.string(),
  mimeType: z.string(),
  data: z.instanceof(Blob),
  sha256: z.string(),
});
export type Photo = z.infer<typeof PhotoSchema>;

// ── Derived Trip ──
export interface DerivedTrip {
  tripStartEvent: LogEvent;
  tripEndEvent: LogEvent | null;
  driverId: string;
  vehicleId: string;
  odometerStart: number;
  odometerEnd: number | null;
  km: number | null;
  fromText: string;
  toText: string | null;
  purpose: Purpose;
  projectOrClient?: string;
  warning?: string;
}

// ── Settings ──
export interface AppSettings {
  adminPin: string;
}
