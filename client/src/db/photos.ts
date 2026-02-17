import { db } from './database';
import { sha256Blob } from '../crypto/hash';
import type { Photo } from './schema';

/**
 * Store a photo in IndexedDB with its SHA-256 hash.
 */
export async function storePhoto(
  vehicleId: string,
  file: File,
): Promise<Photo> {
  const id = crypto.randomUUID();
  const sha256 = await sha256Blob(file);
  const photo: Photo = {
    id,
    vehicleId,
    createdAt: new Date().toISOString(),
    mimeType: file.type,
    data: file,
    sha256,
  };
  await db.photos.add(photo);
  return photo;
}

/**
 * Get a photo by ID.
 */
export async function getPhoto(id: string): Promise<Photo | undefined> {
  return db.photos.get(id);
}

/**
 * Get all photos for a vehicle.
 */
export async function getVehiclePhotos(vehicleId: string): Promise<Photo[]> {
  return db.photos.where('vehicleId').equals(vehicleId).toArray();
}
