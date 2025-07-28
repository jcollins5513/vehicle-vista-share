// This file provides a single source of truth for data structures.
// These types are defined manually to bypass issues with Prisma client generation
// and ensure consistency across the application.

/**
 * Represents a vehicle in the inventory.
 * Based on the Prisma schema and component usage.
 */
export interface Vehicle {
  id: string;
  stockNumber: string;
  vin: string;
  year: number;
  make: string;
  model: string;
  price: number;
  mileage: number;
  features: string[];
  images: string[];
  color: string;
  trim?: string;
  engine?: string;
  transmission?: string;
  description?: string;
  sourceUrl?: string;
  facebookPostId?: string;
  lastFacebookPostDate?: Date;
  lastMarketplacePostDate?: Date;
  carfaxHighlights?: unknown;
  bodyStyle?: string;
  vehicleClass?: string;
  status: 'available' | 'sold';
  isNew?: boolean;
  isFeatured?: boolean;
  isSold?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  media?: Media[];
  threeSixtyImageUrl?: string | null;
  lastUpdated?: Date;
}

/**
 * Represents a user-uploaded media item.
 * Based on the Prisma schema.
 */
export type MediaType = 'IMAGE' | 'VIDEO';

export interface Media {
  id: string;
  url: string;
  s3Key: string;  // Added s3Key to match Prisma model
  type: MediaType;
  vehicleId?: string | null;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Represents a single item in the main showroom slideshow.
 * It can be either a vehicle image or a custom media item.
 */
export interface SlideshowItem {
  id: string; // Unique ID, prefixed with 'v-' or 'c-'
  url: string;
  type: 'IMAGE' | 'VIDEO';
  vehicle: Vehicle | null; // Vehicle details, if it's a vehicle image
}

// Re-export Vehicle as VehicleWithMedia for semantic consistency in components
export type VehicleWithMedia = Vehicle;
export type SomeType = unknown;
