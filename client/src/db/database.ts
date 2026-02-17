import Dexie, { type Table } from 'dexie';
import type { Vehicle, Driver, LogEvent, Photo } from './schema';

export class CarLogBookDB extends Dexie {
  vehicles!: Table<Vehicle, string>;
  drivers!: Table<Driver, string>;
  events!: Table<LogEvent, string>;
  photos!: Table<Photo, string>;

  constructor() {
    super('CarLogBookDB');
    this.version(1).stores({
      vehicles: 'id',
      drivers: 'id',
      events: 'id, vehicleId, type, createdAt, driverId, syncStatus, [vehicleId+createdAt]',
      photos: 'id, vehicleId',
    });
  }
}

export const db = new CarLogBookDB();

// Seed default vehicle on first run
export async function seedDefaults(): Promise<void> {
  const count = await db.vehicles.count();
  if (count === 0) {
    await db.vehicles.add({ id: 'CAR-01', label: 'Company Car #1' });
  }
}
