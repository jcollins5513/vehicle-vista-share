'use client';

import React, { useState, useCallback, useEffect } from 'react';
import Image from 'next/image';
import type { Media } from '@/types';
import { reorderMedia, deleteMedia } from '@/lib/media-api';
import { Trash2 } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface MediaGalleryProps {
  media: Media[];
  onReorder?: (mediaIds: string[]) => void;
}

interface SortableItemProps {
  id: string;
  url: string;
  isMain: boolean;
  onSelect: () => void;
  onDelete: () => void;
  isCustomMedia: boolean; // Flag to indicate if this is a custom uploaded media
}

function SortableMediaItem({ id, url, isMain, onSelect, onDelete, isCustomMedia }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className="relative cursor-grab active:cursor-grabbing"
    >
      <button
        onClick={onSelect}
        className={`rounded-lg overflow-hidden border-2 ${isMain ? 'border-blue-500' : 'border-transparent'} focus:outline-none focus:ring-2 focus:ring-blue-500 w-full h-full`}
        aria-label={`Select as main image`}
      >
        <Image
          src={url}
          alt={`Media item`}
          width={150}
          height={100}
          className="w-full h-full object-cover"
        />
      </button>
      <div
        {...listeners}
        className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-10 flex items-center justify-center"
        aria-label="Drag to reorder"
      >
        {/* Optional: Add drag handle icon here */}
      </div>
      
      {/* Delete button - only show for custom uploaded media */}
      {isCustomMedia && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (window.confirm('Are you sure you want to delete this media?')) {
              onDelete();
            }
          }}
          className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white rounded-full p-1"
          aria-label="Delete media"
        >
          <Trash2 size={16} />
        </button>
      )}
    </div>
  );
}

export default function MediaGallery({ media: initialMedia, onReorder }: MediaGalleryProps) {
  // Filter out stock photos (URLs containing RTT, Chrome, or Default)
  const filteredInitialMedia = initialMedia.filter(item => {
    const url = item.url.toLowerCase();
    return !url.includes('rtt') && !url.includes('chrome') && !url.includes('default');
  });
  
  const [media, setMedia] = useState<Media[]>(filteredInitialMedia);
  const [mainImage, setMainImage] = useState(media[0]?.url || '/placeholder.png');
  
  // Function to handle media deletion
  const handleDeleteMedia = async (mediaId: string) => {
    const success = await deleteMedia(mediaId);
    if (success) {
      // Remove the deleted media from the state
      setMedia((currentMedia) => currentMedia.filter((item) => item.id !== mediaId));
      
      // If the deleted media was the main image, set the first available media as main
      if (media.find((item) => item.id === mediaId)?.url === mainImage) {
        const remainingMedia = media.filter((item) => item.id !== mediaId);
        setMainImage(remainingMedia[0]?.url || '/placeholder.png');
      }
    } else {
      alert('Failed to delete media. Please try again.');
    }
  };

  // Update media state when props change
  useEffect(() => {
    setMedia(initialMedia);
    if (initialMedia.length > 0 && !initialMedia.some(item => item.url === mainImage)) {
      setMainImage(initialMedia[0].url);
    }
  }, [initialMedia, mainImage]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement required before drag starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      setMedia((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        
        const newItems = arrayMove(items, oldIndex, newIndex);
        
        // Get the new order of IDs
        const newOrder = newItems.map((item) => item.id);
        
        // Persist the new order via API
        reorderMedia(newOrder).then(success => {
          if (!success) {
            console.error('Failed to persist media order');
          }
        });
        
        // Call onReorder with the new order of IDs if provided
        if (onReorder) {
          onReorder(newOrder);
        }
        
        return newItems;
      });
    }
  }, [onReorder]);

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
          alt="Main media item"
          width={800}
          height={600}
          className="w-full h-auto object-cover rounded-lg shadow-lg"
          priority
        />
      </div>
      
      <div className="mb-2 flex justify-between items-center">
        <h3 className="text-lg font-medium">Gallery</h3>
        <p className="text-sm text-gray-500">Drag to reorder • Changes save automatically</p>
      </div>
      
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={media.map(item => item.id)} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2">
            {media.map((item) => (
              <SortableMediaItem
                key={item.id}
                id={item.id}
                url={item.url}
                isMain={mainImage === item.url}
                onSelect={() => setMainImage(item.url)}
                onDelete={() => handleDeleteMedia(item.id)}
                isCustomMedia={item.url.includes('amazonaws.com')}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
