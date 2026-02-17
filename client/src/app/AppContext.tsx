import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { db, seedDefaults } from '../db/database';
import { getUnsyncedCount } from '../db/events';
import type { Vehicle, Driver } from '../db/schema';

interface AppState {
  vehicles: Vehicle[];
  drivers: Driver[];
  selectedVehicleId: string | null;
  selectedDriverId: string | null;
  unsyncedCount: number;
  online: boolean;
  setSelectedVehicleId: (id: string | null) => void;
  setSelectedDriverId: (id: string | null) => void;
  addDriver: (name: string) => Promise<Driver>;
  refreshUnsyncedCount: () => Promise<void>;
  refreshDrivers: () => Promise<void>;
  refreshVehicles: () => Promise<void>;
}

const AppContext = createContext<AppState | null>(null);

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const [unsyncedCount, setUnsyncedCount] = useState(0);
  const [online, setOnline] = useState(navigator.onLine);

  const refreshVehicles = useCallback(async () => {
    const v = await db.vehicles.toArray();
    setVehicles(v);
  }, []);

  const refreshDrivers = useCallback(async () => {
    const d = await db.drivers.toArray();
    setDrivers(d);
  }, []);

  const refreshUnsyncedCount = useCallback(async () => {
    const count = await getUnsyncedCount();
    setUnsyncedCount(count);
  }, []);

  const addDriver = useCallback(async (name: string): Promise<Driver> => {
    const driver: Driver = { id: crypto.randomUUID(), name };
    await db.drivers.add(driver);
    await refreshDrivers();
    return driver;
  }, [refreshDrivers]);

  // Init
  useEffect(() => {
    (async () => {
      await seedDefaults();
      await refreshVehicles();
      await refreshDrivers();
      await refreshUnsyncedCount();

      // Check URL for vehicle preselect
      const params = new URLSearchParams(window.location.search);
      const vehicleParam = params.get('v');
      if (vehicleParam) {
        setSelectedVehicleId(vehicleParam);
      }
    })();
  }, [refreshVehicles, refreshDrivers, refreshUnsyncedCount]);

  // Online/offline tracking
  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <AppContext.Provider
      value={{
        vehicles,
        drivers,
        selectedVehicleId,
        selectedDriverId,
        unsyncedCount,
        online,
        setSelectedVehicleId,
        setSelectedDriverId,
        addDriver,
        refreshUnsyncedCount,
        refreshDrivers,
        refreshVehicles,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}
