'use client';

import React, { useMemo, useState } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface CarouselImage {
  url: string;
  alt?: string;
}

interface MediaCarouselProps {
  images: CarouselImage[];
  className?: string;
}

export function MediaCarousel({ images, className }: MediaCarouselProps) {
  const validImages = useMemo(
    () => images.filter((img) => Boolean(img?.url)),
    [images]
  );
  const [index, setIndex] = useState(0);

  if (validImages.length === 0) {
    return (
      <div className={cn('aspect-video w-full rounded-[14px] bg-white/10 border border-white/10', className)} />
    );
  }

  const active = validImages[Math.min(index, validImages.length - 1)];

  const go = (dir: number) => {
    setIndex((prev) => {
      const next = (prev + dir + validImages.length) % validImages.length;
      return next;
    });
  };

  return (
    <div className={cn('flex flex-col gap-3 relative', className)}>
      <div className="relative w-full overflow-hidden rounded-[14px] border border-white/10 bg-black/50">
        <div className="relative aspect-video">
          <Image
            src={active.url}
            alt={active.alt || 'Vehicle image'}
            fill
            sizes="(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw"
            className="object-cover rounded-[14px]"
            priority={false}
          />
        </div>

        {validImages.length > 1 && (
          <>
            <Button
              size="icon"
              variant="secondary"
              className="absolute left-4 top-1/2 -translate-y-1/2 rounded-xl bg-white text-slate-900 hover:bg-white/90"
              onClick={() => go(-1)}
              aria-label="Previous"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <Button
              size="icon"
              variant="secondary"
              className="absolute right-4 top-1/2 -translate-y-1/2 rounded-xl bg-white text-slate-900 hover:bg-white/90"
              onClick={() => go(1)}
              aria-label="Next"
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
              {validImages.map((_, i) => (
                <span
                  key={i}
                  className={cn(
                    'size-2 rounded-full border border-white/50',
                    i === index ? 'bg-white' : 'bg-white/30'
                  )}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {validImages.length > 1 && (
        <div className="flex gap-3 justify-center">
          {validImages.slice(0, 5).map((thumb, i) => (
            <button
              key={thumb.url + i}
              onClick={() => setIndex(i)}
              className={cn(
                'relative size-24 rounded-[14px] overflow-hidden border transition',
                i === index ? 'border-blue-500' : 'border-transparent hover:border-white/40'
              )}
              aria-label={`View image ${i + 1}`}
            >
              <Image
                src={thumb.url}
                alt={thumb.alt || `Thumbnail ${i + 1}`}
                fill
                sizes="96px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

