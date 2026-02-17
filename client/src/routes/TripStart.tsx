import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '../app/AppContext';
import { createEvent } from '../db/events';
import { PhotoCapture } from '../components/PhotoCapture';
import { TripStartPayloadSchema } from '../db/schema';
import type { Photo, Purpose } from '../db/schema';

export function TripStart() {
  const { selectedVehicleId, selectedDriverId, setSelectedVehicleId, refreshUnsyncedCount, vehicles, drivers } = useApp();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [odometerStart, setOdometerStart] = useState('');
  const [fromText, setFromText] = useState('');
  const [purpose, setPurpose] = useState<Purpose>('BUSINESS');
  const [projectOrClient, setProjectOrClient] = useState('');
  const [photoIds, setPhotoIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const v = searchParams.get('v');
    if (v) setSelectedVehicleId(v);
  }, [searchParams, setSelectedVehicleId]);

  const vehicleId = selectedVehicleId ?? searchParams.get('v') ?? '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!vehicleId) { setError('No vehicle selected'); return; }
    if (!selectedDriverId) { setError('No driver selected'); return; }

    const payload = {
      odometerStart: parseInt(odometerStart, 10),
      fromText,
      purpose,
      projectOrClient: projectOrClient || undefined,
      startPhotoIds: photoIds.length > 0 ? photoIds : undefined,
    };

    const result = TripStartPayloadSchema.safeParse(payload);
    if (!result.success) {
      setError(result.error.issues.map((i) => i.message).join(', '));
      return;
    }

    try {
      await createEvent(vehicleId, 'TRIP_START', selectedDriverId, payload as Record<string, unknown>);
      await refreshUnsyncedCount();
      setSuccess(true);
      setTimeout(() => navigate('/'), 1500);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handlePhotoCaptured = (photo: Photo) => {
    setPhotoIds((prev) => [...prev, photo.id]);
  };

  return (
    <div>
      <h2 className="page-title">Start Trip</h2>

      {success && <div className="success-box">Trip started!</div>}
      {error && <div className="error-box">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Vehicle</label>
          <select value={vehicleId} disabled>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>{v.label}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Driver</label>
          <select value={selectedDriverId ?? ''} disabled>
            {drivers.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Odometer Start (km)</label>
          <input
            type="number"
            inputMode="numeric"
            value={odometerStart}
            onChange={(e) => setOdometerStart(e.target.value)}
            placeholder="e.g. 45230"
            required
            min="0"
          />
        </div>

        <div className="form-group">
          <label>From</label>
          <input
            type="text"
            value={fromText}
            onChange={(e) => setFromText(e.target.value)}
            placeholder="Starting location"
            required
          />
        </div>

        <div className="form-group">
          <label>Purpose</label>
          <div className="purpose-toggle">
            <button
              type="button"
              className={purpose === 'BUSINESS' ? 'active' : ''}
              onClick={() => setPurpose('BUSINESS')}
            >
              Business
            </button>
            <button
              type="button"
              className={purpose === 'PRIVATE' ? 'active' : ''}
              onClick={() => setPurpose('PRIVATE')}
            >
              Private
            </button>
          </div>
        </div>

        <div className="form-group">
          <label>Project / Client (optional)</label>
          <input
            type="text"
            value={projectOrClient}
            onChange={(e) => setProjectOrClient(e.target.value)}
            placeholder="e.g. ACME Corp"
          />
        </div>

        <PhotoCapture
          vehicleId={vehicleId}
          onPhotoCaptured={handlePhotoCaptured}
          label="Odometer Photo"
        />

        <button type="submit" className="btn btn-success" disabled={!vehicleId || !selectedDriverId}>
          Start Trip
        </button>
      </form>
    </div>
  );
}
