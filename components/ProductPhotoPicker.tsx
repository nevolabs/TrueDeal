'use client';

import Image from 'next/image';
import { useEffect, useId, useRef, useState } from 'react';

export interface ProductPhoto {
  id: string;
  file: File;
  preview: string;
  path?: string;
}

export default function ProductPhotoPicker({ photos, onChange, disabled = false }: {
  photos: ProductPhoto[];
  onChange: (photos: ProductPhoto[]) => void;
  disabled?: boolean;
}) {
  const inputId = useId();
  const [error, setError] = useState('');
  const previewUrls = useRef(new Set<string>());

  useEffect(() => {
    const urls = previewUrls.current;
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
      urls.clear();
    };
  }, []);

  return (
    <div className="mb-5">
      <label htmlFor={inputId} className="block text-sm font-medium">Product photos (required)</label>
      <p id={`${inputId}-help`} className="mt-1 text-xs text-muted-foreground">Add 1–8 JPEG, PNG or WebP photos, up to 5 MB each. The first photo is your cover. You can add more in another selection.</p>
      <input
        id={inputId}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp"
        disabled={disabled || photos.length >= 8}
        aria-describedby={`${inputId}-help${error ? ` ${inputId}-error` : ''}`}
        aria-invalid={!!error}
        className="mt-2 block w-full text-sm"
        onChange={(event) => {
          const files = Array.from(event.target.files || []);
          event.target.value = '';
          if (!files.length) return;
          if (photos.length + files.length > 8) {
            setError('You can add up to 8 photos. Remove a photo or select fewer files.');
            return;
          }
          if (files.some((file) => !['image/jpeg', 'image/png', 'image/webp'].includes(file.type))) {
            setError('Choose JPEG, PNG or WebP photos only.');
            return;
          }
          if (files.some((file) => file.size > 5 * 1024 * 1024 || file.size === 0)) {
            setError('Each photo must be a nonempty file no larger than 5 MB.');
            return;
          }
          setError('');
          onChange([...photos, ...files.map((file) => {
            const preview = URL.createObjectURL(file);
            previewUrls.current.add(preview);
            return { id: crypto.randomUUID(), file, preview };
          })]);
        }}
      />
      {error && <p id={`${inputId}-error`} role="alert" className="mt-2 text-sm text-danger">{error}</p>}
      <p role="status" className="mt-2 text-xs text-muted-foreground">{photos.length} of 8 photos selected</p>
      {photos.length > 0 && <ol className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {photos.map((photo, index) => <li key={photo.id} className="min-w-0 rounded-lg border border-line bg-surface p-2">
          <Image src={photo.preview} alt={`Selected photo ${index + 1}: ${photo.file.name}`} width={240} height={180} unoptimized className="aspect-[4/3] w-full rounded object-cover" />
          <p className="mt-1 truncate text-xs" title={photo.file.name}>{index === 0 ? 'Cover · ' : ''}{photo.file.name}</p>
          <button type="button" disabled={disabled} aria-label={`Remove photo ${index + 1}: ${photo.file.name}`} className="btn btn-sm btn-secondary mt-2 w-full" onClick={() => {
            URL.revokeObjectURL(photo.preview);
            previewUrls.current.delete(photo.preview);
            onChange(photos.filter((item) => item.id !== photo.id));
            setError('');
          }}>Remove</button>
        </li>)}
      </ol>}
    </div>
  );
}
