import type { LogEvent, DerivedTrip } from '../db/schema';
import { db } from '../db/database';

/**
 * Generate CSV content for events in a given month.
 */
export function generateEventsCsv(events: LogEvent[], drivers: Map<string, string>): string {
  const headers = [
    'Date',
    'Time',
    'Type',
    'Driver',
    'Vehicle',
    'Odometer',
    'From',
    'To',
    'Purpose',
    'Project/Client',
    'Notes',
    'Sync Status',
    'Hash',
  ];

  const rows = events.map((e) => {
    const date = new Date(e.createdAt);
    const payload = e.payload as Record<string, unknown>;
    return [
      date.toLocaleDateString('en-CA'),
      date.toLocaleTimeString('en-GB'),
      e.type,
      drivers.get(e.driverId) || e.driverId,
      e.vehicleId,
      payload.odometer ?? payload.odometerStart ?? payload.odometerEnd ?? '',
      payload.fromText ?? payload.locationText ?? '',
      payload.toText ?? '',
      payload.purpose ?? '',
      payload.projectOrClient ?? '',
      payload.notes ?? payload.reason ?? '',
      e.syncStatus,
      e.hash.substring(0, 12) + '...',
    ];
  });

  return [headers, ...rows].map((row) => row.map(escapeCsv).join(',')).join('\n');
}

/**
 * Generate CSV for derived trips.
 */
export function generateTripsCsv(trips: DerivedTrip[], drivers: Map<string, string>): string {
  const headers = [
    'Start Date',
    'End Date',
    'Driver',
    'Vehicle',
    'From',
    'To',
    'Odometer Start',
    'Odometer End',
    'KM',
    'Purpose',
    'Project/Client',
    'Warning',
  ];

  const rows = trips.map((t) => [
    new Date(t.tripStartEvent.createdAt).toLocaleDateString('en-CA'),
    t.tripEndEvent ? new Date(t.tripEndEvent.createdAt).toLocaleDateString('en-CA') : '',
    drivers.get(t.driverId) || t.driverId,
    t.vehicleId,
    t.fromText,
    t.toText ?? '',
    t.odometerStart,
    t.odometerEnd ?? '',
    t.km ?? '',
    t.purpose,
    t.projectOrClient ?? '',
    t.warning ?? '',
  ]);

  return [headers, ...rows].map((row) => row.map(escapeCsv).join(',')).join('\n');
}

function escapeCsv(value: unknown): string {
  const str = String(value ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Trigger a CSV file download in the browser.
 */
export function downloadCsv(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
