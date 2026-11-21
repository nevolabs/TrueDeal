'use client';

import Image from 'next/image';
import { useState } from 'react';

export default function ProductGallery({ images, title }: { images: string[]; title: string }) {
  const [selected, setSelected] = useState(0);
  const index = Math.min(selected, Math.max(0, images.length - 1));
  return <section aria-label="Product photos">
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-tint">
      {images[index] && <Image src={images[index]} alt={`${title} — photo ${index + 1}`} fill sizes="(min-width: 1024px) 720px, 100vw" className="object-contain" />}
    </div>
    {images.length > 1 && <div className="mt-3 flex flex-wrap gap-2">
      {images.map((src, i) => <button key={src} type="button" aria-label={`View photo ${i + 1}`} aria-pressed={i === index} onClick={() => setSelected(i)} className={`relative h-20 w-20 overflow-hidden rounded-lg border-2 ${i === index ? 'border-foreground' : 'border-line'}`}>
        <Image src={src} alt="" fill sizes="80px" className="object-cover" />
      </button>)}
    </div>}
    {images.length > 1 && <p aria-live="polite" className="mt-2 text-xs text-muted-foreground">Photo {index + 1} of {images.length}</p>}
  </section>;
}
