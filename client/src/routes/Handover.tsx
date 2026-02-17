import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '../app/AppContext';
import { createEvent } from '../db/events';
import { PhotoCapture } from '../components/PhotoCapture';
import { HandoverPayloadSchema } from '../db/schema';
import type { Photo } from '../db/schema';

export function Handover() {
  const { selectedVehicleId, selectedDriverId, setSelectedVehicleId, refreshUnsyncedCount, vehicles, drivers } = useApp();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [odometer, setOdometer] = useState('');
  const [locationText, setLocationText] = useState('');
  const [photoIds, setPhotoIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // QR param preselect
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
      odometer: parseInt(odometer, 10),
      locationText: locationText || undefined,
      odometerPhotoIds: photoIds.length > 0 ? photoIds : undefined,
    };

    const result = HandoverPayloadSchema.safeParse(payload);
    if (!result.success) {
      setError(result.error.issues.map((i) => i.message).join(', '));
      return;
    }

    try {
      await createEvent(vehicleId, 'HANDOVER', selectedDriverId, payload as Record<string, unknown>);
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
      <h2 className="page-title">Handover</h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: 'var(--gap)' }}>
        Record a car key exchange at the garage.
      </p>

      {success && <div className="success-box">Handover recorded successfully!</div>}
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
          <label>Odometer (km)</label>
          <input
            type="number"
            inputMode="numeric"
            value={odometer}
            onChange={(e) => setOdometer(e.target.value)}
            placeholder="e.g. 45230"
            required
            min="0"
          />
        </div>

        <div className="form-group">
          <label>Location (optional)</label>
          <input
            type="text"
            value={locationText}
            onChange={(e) => setLocationText(e.target.value)}
            placeholder="e.g. Main garage"
          />
        </div>

        <PhotoCapture
          vehicleId={vehicleId}
          onPhotoCaptured={handlePhotoCaptured}
          label="Odometer Photo"
        />

        <button type="submit" className="btn btn-primary" disabled={!vehicleId || !selectedDriverId}>
          Record Handover
        </button>
      </form>
    </div>
  );
}
