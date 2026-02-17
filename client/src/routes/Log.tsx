import { useState, useEffect } from 'react';
import { useApp } from '../app/AppContext';
import { getVehicleEvents } from '../db/events';
import { pairTrips } from '../utils/tripPairing';
import type { LogEvent, DerivedTrip } from '../db/schema';

export function Log() {
  const { vehicles, drivers, selectedVehicleId } = useApp();
  const [events, setEvents] = useState<LogEvent[]>([]);
  const [trips, setTrips] = useState<DerivedTrip[]>([]);
  const [filterVehicle, setFilterVehicle] = useState(selectedVehicleId ?? '');
  const [filterDriver, setFilterDriver] = useState('');
  const [viewMode, setViewMode] = useState<'events' | 'trips'>('trips');

  const driverMap = new Map(drivers.map((d) => [d.id, d.name]));

  useEffect(() => {
    if (!filterVehicle) {
      setEvents([]);
      setTrips([]);
      return;
    }
    (async () => {
      const allEvents = await getVehicleEvents(filterVehicle);
      setEvents(allEvents);
      setTrips(pairTrips(allEvents));
    })();
  }, [filterVehicle]);

  const filteredEvents = filterDriver
    ? events.filter((e) => e.driverId === filterDriver)
    : events;

  const filteredTrips = filterDriver
    ? trips.filter((t) => t.driverId === filterDriver)
    : trips;

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-CA') + ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  };

  const renderPayloadSummary = (event: LogEvent): string => {
    const p = event.payload as Record<string, unknown>;
    switch (event.type) {
      case 'HANDOVER':
        return `Odometer: ${p.odometer} km${p.locationText ? ` at ${p.locationText}` : ''}`;
      case 'TRIP_START':
        return `From: ${p.fromText} | ${p.odometerStart} km | ${p.purpose}`;
      case 'TRIP_END':
        return `To: ${p.toText} | ${p.odometerEnd} km`;
      case 'CORRECTION':
        return `Corrects: ${(p.referencesEventId as string).substring(0, 8)}... | ${p.reason}`;
      default:
        return '';
    }
  };

  return (
    <div>
      <h2 className="page-title">Log</h2>

      {/* Filters */}
      <div className="filters">
        <select value={filterVehicle} onChange={(e) => setFilterVehicle(e.target.value)}>
          <option value="">All Vehicles</option>
          {vehicles.map((v) => (
            <option key={v.id} value={v.id}>{v.label}</option>
          ))}
        </select>
        <select value={filterDriver} onChange={(e) => setFilterDriver(e.target.value)}>
          <option value="">All Drivers</option>
          {drivers.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
        <select value={viewMode} onChange={(e) => setViewMode(e.target.value as 'events' | 'trips')}>
          <option value="trips">Trips</option>
          <option value="events">Events</option>
        </select>
      </div>

      {!filterVehicle && (
        <div className="warning-box">Select a vehicle to view the log.</div>
      )}

      {/* Trips view */}
      {viewMode === 'trips' && filteredTrips.map((trip, i) => (
        <div key={i} className="trip-card">
          <div className="trip-card-header">
            <div>
              <div className="trip-route">
                {trip.fromText} → {trip.toText ?? '(in progress)'}
              </div>
              <div className="trip-meta">
                {formatDate(trip.tripStartEvent.createdAt)} ·{' '}
                {driverMap.get(trip.driverId) ?? trip.driverId} ·{' '}
                <span className={`event-type-badge event-type-${trip.purpose === 'BUSINESS' ? 'TRIP_START' : 'TRIP_END'}`}>
                  {trip.purpose}
                </span>
                {trip.projectOrClient && <> · {trip.projectOrClient}</>}
              </div>
            </div>
            <div className="trip-km">
              {trip.km !== null ? `${trip.km} km` : '—'}
            </div>
          </div>
          {trip.warning && <div className="warning-box" style={{ marginTop: 8, marginBottom: 0 }}>{trip.warning}</div>}
        </div>
      ))}

      {/* Events view */}
      {viewMode === 'events' && (
        <div className="card">
          {filteredEvents.length === 0 && filterVehicle && (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>No events yet.</p>
          )}
          {filteredEvents.map((event) => (
            <div key={event.id} className="event-item">
              <div className={`sync-indicator sync-${event.syncStatus}`} title={event.syncStatus} />
              <span className={`event-type-badge event-type-${event.type}`}>{event.type.replace('_', ' ')}</span>
              <div className="event-details">
                <div>{renderPayloadSummary(event)}</div>
                <div className="meta">
                  {formatDate(event.createdAt)} · {driverMap.get(event.driverId) ?? event.driverId} · {event.hash.substring(0, 10)}...
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {viewMode === 'trips' && filteredTrips.length === 0 && filterVehicle && (
        <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>No trips recorded yet.</p>
      )}
    </div>
  );
}
