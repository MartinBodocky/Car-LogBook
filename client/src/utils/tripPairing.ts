import type { LogEvent, DerivedTrip, TripStartPayload, TripEndPayload, Purpose } from '../db/schema';

/**
 * Pair TRIP_START events with their nearest subsequent TRIP_END
 * by the same driver + vehicle, in time order.
 */
export function pairTrips(events: LogEvent[]): DerivedTrip[] {
  const starts = events
    .filter((e) => e.type === 'TRIP_START')
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  const ends = events
    .filter((e) => e.type === 'TRIP_END')
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  const usedEndIds = new Set<string>();
  const trips: DerivedTrip[] = [];

  for (const start of starts) {
    const startPayload = start.payload as unknown as TripStartPayload;

    // Find the nearest subsequent TRIP_END by same driver + vehicle
    const matchingEnd = ends.find(
      (end) =>
        !usedEndIds.has(end.id) &&
        end.driverId === start.driverId &&
        end.vehicleId === start.vehicleId &&
        end.createdAt > start.createdAt,
    );

    if (matchingEnd) {
      usedEndIds.add(matchingEnd.id);
      const endPayload = matchingEnd.payload as unknown as TripEndPayload;
      const km = endPayload.odometerEnd - startPayload.odometerStart;

      trips.push({
        tripStartEvent: start,
        tripEndEvent: matchingEnd,
        driverId: start.driverId,
        vehicleId: start.vehicleId,
        odometerStart: startPayload.odometerStart,
        odometerEnd: endPayload.odometerEnd,
        km: km >= 0 ? km : null,
        fromText: startPayload.fromText,
        toText: endPayload.toText,
        purpose: startPayload.purpose as Purpose,
        projectOrClient: startPayload.projectOrClient,
        warning: km < 0 ? 'Negative distance — check odometer readings' : undefined,
      });
    } else {
      // Unpaired start
      trips.push({
        tripStartEvent: start,
        tripEndEvent: null,
        driverId: start.driverId,
        vehicleId: start.vehicleId,
        odometerStart: startPayload.odometerStart,
        odometerEnd: null,
        km: null,
        fromText: startPayload.fromText,
        toText: null,
        purpose: startPayload.purpose as Purpose,
        projectOrClient: startPayload.projectOrClient,
        warning: 'Trip not yet ended — missing TRIP_END',
      });
    }
  }

  // Check for orphaned TRIP_END events
  for (const end of ends) {
    if (!usedEndIds.has(end.id)) {
      const endPayload = end.payload as unknown as TripEndPayload;
      trips.push({
        tripStartEvent: end, // Use the end event as reference
        tripEndEvent: end,
        driverId: end.driverId,
        vehicleId: end.vehicleId,
        odometerStart: 0,
        odometerEnd: endPayload.odometerEnd,
        km: null,
        fromText: '(unknown)',
        toText: endPayload.toText,
        purpose: 'BUSINESS',
        warning: 'Orphaned TRIP_END — no matching TRIP_START',
      });
    }
  }

  return trips.sort((a, b) =>
    a.tripStartEvent.createdAt.localeCompare(b.tripStartEvent.createdAt),
  );
}
