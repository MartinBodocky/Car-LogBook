import { useState, useEffect } from 'react';
import { useApp } from '../app/AppContext';
import { getVehicleEvents } from '../db/events';
import { pairTrips } from '../utils/tripPairing';
import { generateTripsCsv, downloadCsv } from '../utils/exportCsv';
import { generatePdf, downloadPdf } from '../utils/exportPdf';
import { verifyChain } from '../crypto/verify';
import type { LogEvent, DerivedTrip } from '../db/schema';
import type { VerifyResult } from '../crypto/verify';

const DEFAULT_PIN = '1234';

export function AdminExport() {
  const { vehicles, drivers } = useApp();
  const [pin, setPin] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [pinError, setPinError] = useState(false);

  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const [events, setEvents] = useState<LogEvent[]>([]);
  const [trips, setTrips] = useState<DerivedTrip[]>([]);
  const [verifyResult, setVerifyResult] = useState<VerifyResult | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [exporting, setExporting] = useState(false);

  const driverMap = new Map(drivers.map((d) => [d.id, d.name]));

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === DEFAULT_PIN) {
      setAuthenticated(true);
      setPinError(false);
    } else {
      setPinError(true);
    }
  };

  // Load data when vehicle/month changes
  useEffect(() => {
    if (!selectedVehicle || !authenticated) return;
    (async () => {
      const allEvents = await getVehicleEvents(selectedVehicle);

      // Filter by month
      const [year, month] = selectedMonth.split('-').map(Number);
      const monthStart = new Date(year, month - 1, 1);
      const monthEnd = new Date(year, month, 1);

      const monthEvents = allEvents.filter((e) => {
        const d = new Date(e.createdAt);
        return d >= monthStart && d < monthEnd;
      });

      setEvents(monthEvents);
      setTrips(pairTrips(monthEvents));
    })();
  }, [selectedVehicle, selectedMonth, authenticated]);

  const handleExportCsv = () => {
    const csv = generateTripsCsv(trips, driverMap);
    downloadCsv(csv, `logbook-${selectedVehicle}-${selectedMonth}.csv`);
  };

  const handleExportPdf = async () => {
    setExporting(true);
    try {
      const pdfBytes = await generatePdf(trips, driverMap, selectedMonth, selectedVehicle);
      downloadPdf(pdfBytes, `logbook-${selectedVehicle}-${selectedMonth}.pdf`);
    } finally {
      setExporting(false);
    }
  };

  const handleVerify = async () => {
    if (!selectedVehicle) return;
    setVerifying(true);
    try {
      const result = await verifyChain(selectedVehicle);
      setVerifyResult(result);
    } finally {
      setVerifying(false);
    }
  };

  if (!authenticated) {
    return (
      <div>
        <h2 className="page-title">Admin Export</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: 'var(--gap)' }}>
          Enter admin PIN to access exports.
        </p>
        <form onSubmit={handlePinSubmit}>
          <div className="pin-input">
            <input
              type="password"
              inputMode="numeric"
              maxLength={8}
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="PIN"
              autoFocus
            />
          </div>
          {pinError && <div className="error-box">Incorrect PIN. Default: 1234</div>}
          <button type="submit" className="btn btn-primary">
            Unlock
          </button>
        </form>
      </div>
    );
  }

  return (
    <div>
      <h2 className="page-title">Admin Export</h2>

      {/* Vehicle + Month selectors */}
      <div className="form-group">
        <label>Vehicle</label>
        <select value={selectedVehicle} onChange={(e) => setSelectedVehicle(e.target.value)}>
          <option value="">Select vehicle...</option>
          {vehicles.map((v) => (
            <option key={v.id} value={v.id}>{v.label}</option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label>Month</label>
        <input
          type="month"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
        />
      </div>

      {selectedVehicle && (
        <>
          {/* Summary */}
          <div className="card">
            <h3 style={{ marginBottom: 8 }}>Summary</h3>
            <p>Events: {events.length} | Trips: {trips.length}</p>
            <p>
              Total KM:{' '}
              {trips
                .filter((t) => t.km !== null && t.km >= 0)
                .reduce((sum, t) => sum + (t.km ?? 0), 0)}{' '}
              km
            </p>
            <p>
              Business:{' '}
              {trips
                .filter((t) => t.purpose === 'BUSINESS' && t.km !== null && t.km >= 0)
                .reduce((sum, t) => sum + (t.km ?? 0), 0)}{' '}
              km | Private:{' '}
              {trips
                .filter((t) => t.purpose === 'PRIVATE' && t.km !== null && t.km >= 0)
                .reduce((sum, t) => sum + (t.km ?? 0), 0)}{' '}
              km
            </p>
          </div>

          {/* Export buttons */}
          <div className="action-grid">
            <button className="btn btn-primary" onClick={handleExportCsv} disabled={trips.length === 0}>
              Export CSV
            </button>
            <button className="btn btn-success" onClick={handleExportPdf} disabled={trips.length === 0 || exporting}>
              {exporting ? 'Generating...' : 'Export PDF'}
            </button>
          </div>

          {/* Integrity verification */}
          <div className="card" style={{ marginTop: 'var(--gap)' }}>
            <h3 style={{ marginBottom: 8 }}>Integrity Verification</h3>
            <button
              className="btn btn-outline btn-small"
              onClick={handleVerify}
              disabled={verifying}
            >
              {verifying ? 'Verifying...' : 'Verify Hash Chain'}
            </button>

            {verifyResult && (
              <div style={{ marginTop: 12 }}>
                {verifyResult.ok ? (
                  <p className="verify-ok">Chain integrity verified — no breaks detected.</p>
                ) : (
                  <div>
                    <p className="verify-fail">Chain integrity BROKEN — {verifyResult.breaks.length} issue(s):</p>
                    {verifyResult.breaks.map((b, i) => (
                      <div key={i} className="break-item">
                        Event {b.eventId.substring(0, 8)}...: {b.reason}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
