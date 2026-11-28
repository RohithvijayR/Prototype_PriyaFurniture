import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { Armchair } from 'lucide-react';

interface SafeImageProps {
  src: string;
  alt: string;
  className?: string;
  containerClassName?: string;
  fallbackTitle?: string;
  loading?: 'eager' | 'lazy';
}

function buildAttemptSrc(src: string, retryCount: number): string {
  if (!src || retryCount === 0) return src;
  if (src.startsWith('data:') || src.startsWith('blob:')) return src;
  const separator = src.includes('?') ? '&' : '?';
  return `${src}${separator}retry=${retryCount}`;
}

export function SafeImage({
  src,
  alt,
  className = '',
  containerClassName = 'bg-[#EFE8DC]',
  fallbackTitle,
  loading = 'lazy',
}: SafeImageProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const retryTimerRef = useRef<number | null>(null);
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const attemptSrc = buildAttemptSrc(src, retryCount);

  useEffect(() => {
    return () => {
      if (retryTimerRef.current !== null) {
        window.clearTimeout(retryTimerRef.current);
      }
    };
  }, []);

  // Reset state when src changes and synchronously detect already-cached images before paint.
  useLayoutEffect(() => {
    if (retryTimerRef.current !== null) {
      window.clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }

    setHasError(false);
    setRetryCount(0);

    const img = imgRef.current;
    // Only treat an image as already loaded when naturalWidth > 0.
    // Never mark hasError here for img.complete && naturalWidth === 0, because
    // off-screen loading="lazy" images report complete=true, naturalWidth=0
    // before the browser begins fetching them.
    if (img && img.complete && img.naturalWidth > 0) {
      setIsLoaded(true);
      return;
    }

    setIsLoaded(false);
  }, [src]);

  // Re-check cached completion after mount/retry in case the load event fired
  // before React attached listeners.
  useEffect(() => {
    if (hasError || isLoaded) return;
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth > 0) {
      setIsLoaded(true);
    }
  }, [hasError, isLoaded, retryCount, attemptSrc]);

  const handleLoad = () => {
    setHasError(false);
    setIsLoaded(true);
  };

  const handleError = () => {
    // Allow one delayed cache-busted retry for transient CDN/network hiccups
    // under concurrent loads before falling back to the placeholder preview card.
    if (retryCount < 1 && src) {
      if (retryTimerRef.current !== null) {
        window.clearTimeout(retryTimerRef.current);
      }
      retryTimerRef.current = window.setTimeout(() => {
        retryTimerRef.current = null;
        setRetryCount((prev) => prev + 1);
      }, 250);
      return;
    }
    setIsLoaded(false);
    setHasError(true);
  };

  if (!src || hasError) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={`flex flex-col items-center justify-center bg-[#F5F0E8] text-[#202735]/70 border border-[#D9CBB8]/60 p-6 text-center w-full h-full ${className}`}
      >
        <Armchair className="w-8 h-8 mb-3 text-[#9B4D17]/70 stroke-[1.5]" aria-hidden="true" />
        <span className="font-display text-sm text-[#202735] max-w-[22ch]">
          {fallbackTitle || alt}
        </span>
        <span className="mt-1 text-xs text-[#586070]">Catalogue product preview</span>
      </div>
    );
  }

  return (
    <div className={`relative w-full h-full overflow-hidden ${containerClassName}`}>
      <img
        key={`${attemptSrc}-${retryCount}`}
        ref={imgRef}
        src={attemptSrc}
        alt={alt}
        loading={loading}
        decoding="async"
        referrerPolicy="no-referrer"
        onLoad={handleLoad}
        onError={handleError}
        className={className}
      />
      {!isLoaded && (
        <div
          aria-hidden="true"
          className="absolute inset-0 z-10 pointer-events-none skeleton-shimmer"
        />
      )}
    </div>
  );
}
