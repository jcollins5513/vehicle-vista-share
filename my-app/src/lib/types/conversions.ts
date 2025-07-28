import type { Vehicle, Media, MediaType } from '@/types';

// Helper to ensure a value is a valid Date
export function ensureDate(date: Date | string | null | undefined): Date {
  if (!date) return new Date();
  return date instanceof Date ? date : new Date(date);
}

// Helper to parse JSON with fallback
export function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return json ? JSON.parse(json) : fallback;
  } catch {
    return fallback;
  }
}

// Helper to parse date with fallback
export function safeDateParse(date: string | Date | null | undefined): Date | undefined {
  if (!date) return undefined;
  return date instanceof Date ? date : new Date(date);
}

/**
 * Convert Prisma Vehicle model to application Vehicle type
 */
export function toVehicle(vehicle: Vehicle & { media?: Media[] }): Vehicle {
  // Ensure all required Vehicle properties are present
  const result: Vehicle = {
    ...vehicle,
    // Required fields with defaults if not provided
    id: vehicle.id,
    stockNumber: vehicle.stockNumber || '',
    vin: vehicle.vin || '',
    make: vehicle.make || '',
    model: vehicle.model || '',
    year: vehicle.year || new Date().getFullYear(),
    price: vehicle.price || 0,
    mileage: vehicle.mileage || 0,
    // Ensure all required fields are properly typed
    trim: vehicle.trim ?? undefined,
    engine: vehicle.engine ?? undefined,
    transmission: vehicle.transmission ?? undefined,
    sourceUrl: vehicle.sourceUrl ?? undefined,
    facebookPostId: vehicle.facebookPostId ?? undefined,
    lastFacebookPostDate: safeDateParse(vehicle.lastFacebookPostDate),
    carfaxHighlights: safeJsonParse(vehicle.carfaxHighlights as string, {}),
    vehicleClass: vehicle.vehicleClass ?? 'SUV',
    bodyStyle: vehicle.bodyStyle ?? undefined,
    lastMarketplacePostDate: safeDateParse(vehicle.lastMarketplacePostDate),
    // Ensure arrays are always arrays with proper types
    features: Array.isArray(vehicle.features) ? vehicle.features : [],
    images: Array.isArray(vehicle.images) ? vehicle.images : [],
    // Convert dates to Date objects if they're strings
    createdAt: safeDateParse(vehicle.createdAt) || new Date(),
    updatedAt: safeDateParse(vehicle.updatedAt) || new Date(),
  };

  // Handle nested media if present
  if (vehicle.media) {
    result.media = vehicle.media.map(toMedia);
  }

  return result;
}

/**
 * Convert Prisma Media model to application Media type
 */
export function toMedia(media: Media): Media {
  // Ensure all required Media properties are present
  const result: Media = {
    ...media,
    // Required fields with defaults
    id: media.id,
    url: media.url || '',
    s3Key: media.s3Key || '',
    type: media.type as MediaType,
    order: media.order || 0,
    // Convert dates to Date objects if they're strings
    createdAt: ensureDate(media.createdAt),
      updatedAt: ensureDate((media as { updatedAt?: Date }).updatedAt || media.createdAt), // Handle potential missing updatedAt
    // Optional fields with proper typing
    vehicleId: media.vehicleId || undefined,
  };

  return result;
}

/**
 * Convert application Vehicle type to Redis-compatible format
 */
export function vehicleToRedis(vehicle: Omit<Vehicle, 'media'>): Record<string, string> {
  // Start with an empty object and manually add each property with proper string conversion
  const result: Record<string, string> = {
    id: vehicle.id,
    stockNumber: vehicle.stockNumber,
    make: vehicle.make,
    model: vehicle.model,
    year: vehicle.year.toString(),
    price: vehicle.price.toString(),
    mileage: vehicle.mileage.toString(),
    color: vehicle.color,
    vin: vehicle.vin,
    // Convert boolean values to strings
    isNew: vehicle.isNew?.toString() || 'false',
    isFeatured: vehicle.isFeatured?.toString() || 'false',
    isSold: vehicle.isSold?.toString() || 'false',
    features: JSON.stringify(vehicle.features || []),
    images: JSON.stringify(vehicle.images || []),
    // Convert dates to ISO strings with null checks
    createdAt: vehicle.createdAt ? vehicle.createdAt.toISOString() : new Date().toISOString(),
    updatedAt: vehicle.updatedAt ? vehicle.updatedAt.toISOString() : new Date().toISOString(),
    // Convert null/undefined to empty strings for Redis
    trim: vehicle.trim ?? '',
    engine: vehicle.engine ?? '',
    transmission: vehicle.transmission ?? '',
    sourceUrl: vehicle.sourceUrl ?? '',
    facebookPostId: vehicle.facebookPostId ?? '',
    lastFacebookPostDate: vehicle.lastFacebookPostDate?.toISOString() ?? '',
    carfaxHighlights: JSON.stringify(vehicle.carfaxHighlights || {}),
    vehicleClass: vehicle.vehicleClass ?? 'SUV',
    bodyStyle: vehicle.bodyStyle ?? '',
    lastMarketplacePostDate: vehicle.lastMarketplacePostDate?.toISOString() ?? '',
    threeSixtyImageUrl: vehicle.threeSixtyImageUrl ?? '',
  };

  // Remove any undefined values
  Object.keys(result).forEach(key => {
    if (result[key] === undefined) {
      result[key] = '';
    }
  });

  return result;
}

/**
 * Convert Redis hash to Vehicle type
 */
export function redisToVehicle(data: Record<string, string>): Omit<Vehicle, 'media'> {
  // Ensure all required Vehicle properties are present with defaults
  const result: Omit<Vehicle, 'media'> = {
    ...data,
    // Required fields with defaults
    id: data.id || '',
    stockNumber: data.stockNumber || '',
    vin: data.vin || '',
    make: data.make || '',
    model: data.model || '',
    color: data.color || 'Unknown', // Default color
    description: data.description || '', // Default empty description
    // Convert strings to proper types
    year: parseInt(data.year, 10) || 0,
    price: parseInt(data.price, 10) || 0,
    mileage: parseInt(data.mileage, 10) || 0,
    features: safeJsonParse(data.features, [] as string[]),
    images: safeJsonParse(data.images, [] as string[]),
    // Convert dates to Date objects
    createdAt: ensureDate(data.createdAt),
    updatedAt: ensureDate(data.updatedAt),
    // Handle optional fields
    trim: data.trim || undefined,
    engine: data.engine || undefined,
    transmission: data.transmission || undefined,
    sourceUrl: data.sourceUrl || undefined,
    facebookPostId: data.facebookPostId || undefined,
    lastFacebookPostDate: safeDateParse(data.lastFacebookPostDate),
    carfaxHighlights: safeJsonParse(data.carfaxHighlights, {}),
      vehicleClass: (data.vehicleClass as unknown) as string || 'SUV',
    bodyStyle: data.bodyStyle || undefined,
    lastMarketplacePostDate: safeDateParse(data.lastMarketplacePostDate),
    threeSixtyImageUrl: data.threeSixtyImageUrl || null,
      status: (data.status === 'available' || data.status === 'sold' ? data.status : 'available'),
  };

  return result;
}

/**
 * Convert application Media type to Redis-compatible format
 */
export function mediaToRedis(media: Media): Record<string, string> {
  const result: Record<string, string> = {
    ...media,
    // Convert complex types to strings
    order: media.order.toString(),
    type: media.type,
    // Convert dates to ISO strings
    createdAt: media.createdAt.toISOString(),
    updatedAt: media.updatedAt.toISOString(),
    // Convert null/undefined to empty strings for Redis
    vehicleId: media.vehicleId ?? '',
  };

  // Remove any undefined values
  Object.keys(result).forEach(key => {
    if (result[key] === undefined) {
      result[key] = '';
    }
  });

  return result;
}

/**
 * Convert Redis hash to Media type
 */
export function redisToMedia(data: Record<string, string>): Media {
  // Ensure all required Media properties are present with defaults
  return {
    ...data,
    // Required fields with defaults
    id: data.id || '',
    url: data.url || '',
    s3Key: data.s3Key || '',
    // Convert strings to proper types
    order: parseInt(data.order, 10) || 0,
    type: (data.type as MediaType) || 'image',
    // Convert dates to Date objects
    createdAt: ensureDate(data.createdAt),
    updatedAt: ensureDate(data.updatedAt),
    // Handle optional fields
    vehicleId: data.vehicleId || undefined,
  };
}
