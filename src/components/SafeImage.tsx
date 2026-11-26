import { useState, useEffect, useRef } from 'react';
import { Armchair } from 'lucide-react';

interface SafeImageProps {
  src: string;
  alt: string;
  className?: string;
  containerClassName?: string;
  fallbackTitle?: string;
  loading?: 'eager' | 'lazy';
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
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setHasError(false);

    const img = imgRef.current;
    if (img && img.complete) {
      if (img.naturalWidth > 0) {
        setIsLoaded(true);
      } else {
        setIsLoaded(false);
        setHasError(true);
      }
      return;
    }

    setIsLoaded(false);
  }, [src]);

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
      {!isLoaded && (
        <div
          aria-hidden="true"
          className="absolute inset-0 skeleton-shimmer"
        />
      )}
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        loading={loading}
        referrerPolicy="no-referrer"
        onLoad={() => setIsLoaded(true)}
        onError={() => setHasError(true)}
        className={`${className} transition-opacity duration-500 ease-out ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </div>
  );
}
