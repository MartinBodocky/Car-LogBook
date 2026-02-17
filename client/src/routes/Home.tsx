import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useApp } from '../app/AppContext';
import { useEffect } from 'react';

export function Home() {
  const {
    vehicles,
    drivers,
    selectedVehicleId,
    selectedDriverId,
    setSelectedVehicleId,
    setSelectedDriverId,
    addDriver,
  } = useApp();
  const [newDriverName, setNewDriverName] = useState('');
  const [searchParams] = useSearchParams();

  // QR param preselect
  useEffect(() => {
    const v = searchParams.get('v');
    if (v) setSelectedVehicleId(v);
  }, [searchParams, setSelectedVehicleId]);

  const handleAddDriver = async () => {
    const name = newDriverName.trim();
    if (!name) return;
    const driver = await addDriver(name);
    setSelectedDriverId(driver.id);
    setNewDriverName('');
  };

  return (
    <div>
      <h2 className="page-title">Car LogBook</h2>

      {/* Vehicle selector */}
      <div className="form-group">
        <label>Vehicle</label>
        <select
          value={selectedVehicleId ?? ''}
          onChange={(e) => setSelectedVehicleId(e.target.value || null)}
        >
          <option value="">Select vehicle...</option>
          {vehicles.map((v) => (
            <option key={v.id} value={v.id}>
              {v.label} ({v.id})
            </option>
          ))}
        </select>
      </div>

      {/* Driver selector */}
      <div className="form-group">
        <label>Driver</label>
        <select
          value={selectedDriverId ?? ''}
          onChange={(e) => setSelectedDriverId(e.target.value || null)}
        >
          <option value="">Select driver...</option>
          {drivers.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </div>

      {/* Add driver */}
      <div className="add-driver-inline">
        <input
          type="text"
          placeholder="New driver name"
          value={newDriverName}
          onChange={(e) => setNewDriverName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAddDriver()}
        />
        <button className="btn btn-small btn-primary" onClick={handleAddDriver}>
          Add
        </button>
      </div>

      {/* Action buttons */}
      <div className="action-grid">
        <Link
          to={`/handover${selectedVehicleId ? `?v=${selectedVehicleId}` : ''}`}
          className="btn btn-primary"
          style={{ pointerEvents: !selectedVehicleId || !selectedDriverId ? 'none' : 'auto', opacity: !selectedVehicleId || !selectedDriverId ? 0.5 : 1 }}
        >
          Handover
        </Link>
        <Link
          to={`/trip/start${selectedVehicleId ? `?v=${selectedVehicleId}` : ''}`}
          className="btn btn-success"
          style={{ pointerEvents: !selectedVehicleId || !selectedDriverId ? 'none' : 'auto', opacity: !selectedVehicleId || !selectedDriverId ? 0.5 : 1 }}
        >
          Start Trip
        </Link>
        <Link
          to={`/trip/end${selectedVehicleId ? `?v=${selectedVehicleId}` : ''}`}
          className="btn btn-outline"
          style={{ pointerEvents: !selectedVehicleId || !selectedDriverId ? 'none' : 'auto', opacity: !selectedVehicleId || !selectedDriverId ? 0.5 : 1 }}
        >
          End Trip
        </Link>
        <Link to="/log" className="btn btn-outline">
          View Log
        </Link>
      </div>

      {!selectedVehicleId && (
        <div className="warning-box">Please select a vehicle to continue.</div>
      )}
      {selectedVehicleId && !selectedDriverId && (
        <div className="warning-box">Please select or add a driver to continue.</div>
      )}
    </div>
  );
}
