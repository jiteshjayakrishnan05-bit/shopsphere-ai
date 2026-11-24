"use client";

import { useCallback, useRef, useState } from "react";
import Image from "next/image";
import { ImageOff, X, ZoomIn } from "lucide-react";
import { useDialogA11y } from "@/hooks/use-dialog-a11y";
import { cn } from "@/lib/utils";

/** Main image + thumbnails + accessible lightbox. Broken images fall back to a placeholder. */
export function ImageGallery({ images, title }) {
  const [index, setIndex] = useState(0);
  const [failed, setFailed] = useState({});
  const [zoom, setZoom] = useState(false);
  const lightboxRef = useRef(null);
  const closeZoom = useCallback(() => setZoom(false), []);
  useDialogA11y({ open: zoom, onClose: closeZoom, containerRef: lightboxRef });

  const current = images[index];
  const broken = !current || failed[index];
  const Placeholder = (
    <div className="grid h-full w-full place-items-center text-ink-soft">
      <ImageOff className="h-10 w-10" aria-hidden="true" />
      <span className="sr-only">Image unavailable</span>
    </div>
  );

  return (
    <div>
      <button
        type="button"
        onClick={() => !broken && setZoom(true)}
        aria-label={broken ? "Image unavailable" : "Zoom image"}
        className="group relative block aspect-square w-full overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface"
      >
        {broken ? Placeholder : (
          <>
            <Image src={current} alt={title} fill priority sizes="(min-width: 1024px) 40vw, 100vw" className="object-contain" onError={() => setFailed((f) => ({ ...f, [index]: true }))} />
            <span className="absolute bottom-3 right-3 grid h-9 w-9 place-items-center rounded-full bg-surface/90 shadow-card">
              <ZoomIn className="h-5 w-5" aria-hidden="true" />
            </span>
          </>
        )}
      </button>

      {images.length > 1 && (
        <ul aria-label="Product images" className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {images.map((src, i) => (
            <li key={src + i}>
              <button
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Show image ${i + 1} of ${images.length}`}
                aria-current={i === index ? "true" : undefined}
                className={cn("relative h-16 w-16 overflow-hidden rounded-md border bg-surface", i === index ? "border-brand-600 ring-1 ring-brand-600" : "border-line")}
              >
                {failed[i] ? <ImageOff className="m-auto h-5 w-5 text-ink-soft" aria-hidden="true" /> : <Image src={src} alt="" fill sizes="64px" className="object-contain" onError={() => setFailed((f) => ({ ...f, [i]: true }))} />}
              </button>
            </li>
          ))}
        </ul>
      )}

      {zoom && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4">
          <div className="absolute inset-0 bg-ink/70" onClick={closeZoom} aria-hidden="true" />
          <div ref={lightboxRef} role="dialog" aria-modal="true" aria-label={`${title}, enlarged image`} className="relative h-[85vh] w-full max-w-4xl rounded-lg bg-surface p-2">
            <button type="button" onClick={closeZoom} aria-label="Close enlarged image" className="absolute right-3 top-3 z-10 grid h-10 w-10 place-items-center rounded-full bg-surface shadow-card">
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
            <div className="relative h-full w-full">
              <Image src={current} alt={title} fill sizes="90vw" className="object-contain" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
