'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import type { Media } from '@/types';

interface MediaGalleryProps {
  media: Media[];
}

export default function MediaGallery({ media }: MediaGalleryProps) {
  const [mainImage, setMainImage] = useState(media[0]?.url || '/placeholder.png');

  if (!media || media.length === 0) {
    return (
      <div>
        <Image
          src="/placeholder.png"
          alt="No image available"
          width={800}
          height={600}
          className="w-full h-auto object-cover rounded-lg"
        />
        <p className="text-center mt-2 text-gray-500">No images available for this vehicle.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4">
        <Image
          src={mainImage}
          alt="Main vehicle image"
          width={800}
          height={600}
          className="w-full h-auto object-cover rounded-lg shadow-lg"
          priority
        />
      </div>
      <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2">
        {media.map((item) => (
          <button
            key={item.id}
            onClick={() => setMainImage(item.url)}
            className={`rounded-lg overflow-hidden border-2 ${mainImage === item.url ? 'border-blue-500' : 'border-transparent'} focus:outline-none focus:ring-2 focus:ring-blue-500`}
          >
            <Image
              src={item.url}
              alt={`Vehicle image ${item.order + 1}`}
              width={150}
              height={100}
              className="w-full h-full object-cover"
            />
          </button>
        ))}
      </div>
    </div>
  );
}
