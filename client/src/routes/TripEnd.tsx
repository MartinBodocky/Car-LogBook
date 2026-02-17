import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '../app/AppContext';
import { createEvent } from '../db/events';
import { PhotoCapture } from '../components/PhotoCapture';
import { TripEndPayloadSchema } from '../db/schema';
import type { Photo } from '../db/schema';

export function TripEnd() {
  const { selectedVehicleId, selectedDriverId, setSelectedVehicleId, refreshUnsyncedCount, vehicles, drivers } = useApp();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [odometerEnd, setOdometerEnd] = useState('');
  const [toText, setToText] = useState('');
  const [notes, setNotes] = useState('');
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
      odometerEnd: parseInt(odometerEnd, 10),
      toText,
      endPhotoIds: photoIds.length > 0 ? photoIds : undefined,
      notes: notes || undefined,
    };

    const result = TripEndPayloadSchema.safeParse(payload);
    if (!result.success) {
      setError(result.error.issues.map((i) => i.message).join(', '));
      return;
    }

    try {
      await createEvent(vehicleId, 'TRIP_END', selectedDriverId, payload as Record<string, unknown>);
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
      <h2 className="page-title">End Trip</h2>

      {success && <div className="success-box">Trip ended!</div>}
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
          <label>Odometer End (km)</label>
          <input
            type="number"
            inputMode="numeric"
            value={odometerEnd}
            onChange={(e) => setOdometerEnd(e.target.value)}
            placeholder="e.g. 45280"
            required
            min="0"
          />
        </div>

        <div className="form-group">
          <label>To</label>
          <input
            type="text"
            value={toText}
            onChange={(e) => setToText(e.target.value)}
            placeholder="Destination"
            required
          />
        </div>

        <div className="form-group">
          <label>Notes (optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any notes..."
            rows={3}
          />
        </div>

        <PhotoCapture
          vehicleId={vehicleId}
          onPhotoCaptured={handlePhotoCaptured}
          label="Odometer Photo"
        />

        <button type="submit" className="btn btn-primary" disabled={!vehicleId || !selectedDriverId}>
          End Trip
        </button>
      </form>
    </div>
  );
}
