import { useState, useRef } from 'react';
import { storePhoto } from '../db/photos';
import type { Photo } from '../db/schema';

interface PhotoCaptureProps {
  vehicleId: string;
  onPhotoCaptured: (photo: Photo) => void;
  label?: string;
}

export function PhotoCapture({ vehicleId, onPhotoCaptured, label = 'Capture Photo' }: PhotoCaptureProps) {
  const [previews, setPreviews] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (const file of Array.from(files)) {
      const photo = await storePhoto(vehicleId, file);
      onPhotoCaptured(photo);

      // Create preview
      const url = URL.createObjectURL(file);
      setPreviews((prev) => [...prev, url]);
    }

    // Reset input
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="form-group">
      <label>{label}</label>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleCapture}
        style={{ display: 'none' }}
      />
      <button
        type="button"
        className="btn btn-outline"
        onClick={() => inputRef.current?.click()}
      >
        {label}
      </button>
      {previews.length > 0 && (
        <div className="photo-preview">
          {previews.map((url, i) => (
            <img key={i} src={url} alt={`Captured ${i + 1}`} />
          ))}
        </div>
      )}
    </div>
  );
}
