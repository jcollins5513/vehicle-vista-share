import { redisClient } from '@/lib/redis';
import type { Vehicle, Media } from '@/types';

// Key patterns
const VEHICLE_KEY = (id: string) => `vehicle:${id}`;
const VEHICLES_KEY = 'vehicles:all';
const MEDIA_KEY = (id: string) => `media:${id}`;
const VEHICLE_MEDIA_KEY = (vehicleId: string) => `vehicle:${vehicleId}:media`;
const UNATTACHED_MEDIA_KEY = 'media:unattached';

// TTL in seconds (1 hour)
const DEFAULT_TTL = 60 * 60;

export const redisService = {
  // Vehicle operations
  async getVehicle(id: string): Promise<Vehicle | null> {
    const key = VEHICLE_KEY(id);
    const exists = await redisClient.exists(key);
    
    if (!exists) {
      return null;
    }
    
    const vehicleData = await redisClient.hgetall(key);
    if (!vehicleData || Object.keys(vehicleData).length === 0) {
      return null;
    }
    
    // Convert string values to their proper types
    return {
      ...vehicleData,
      id: vehicleData.id,
      year: parseInt(vehicleData.year, 10),
      price: parseInt(vehicleData.price, 10),
      mileage: parseInt(vehicleData.mileage, 10),
      features: JSON.parse(vehicleData.features || '[]'),
      images: JSON.parse(vehicleData.images || '[]'),
      status: vehicleData.status as 'available' | 'sold',
      createdAt: new Date(vehicleData.createdAt),
      updatedAt: new Date(vehicleData.updatedAt),
    } as Vehicle;
  },

  async cacheVehicle(vehicle: Vehicle, ttl = DEFAULT_TTL): Promise<void> {
    const key = VEHICLE_KEY(vehicle.id);
    
    // Convert complex types to strings
    const vehicleData = {
      ...vehicle,
      year: vehicle.year.toString(),
      price: vehicle.price.toString(),
      mileage: vehicle.mileage.toString(),
      features: JSON.stringify(vehicle.features || []),
      images: JSON.stringify(vehicle.images || []),
      createdAt: vehicle.createdAt.toISOString(),
      updatedAt: vehicle.updatedAt.toISOString(),
    };
    
    // Add to vehicles sorted set with timestamp for ordering
    await redisClient.zadd(VEHICLES_KEY, Date.now(), vehicle.id);
    
    // Set the vehicle data
    await redisClient.hset(key, vehicleData);
    
    // Set TTL
    await redisClient.expire(key, ttl);
  },

  async getVehicles(): Promise<Vehicle[]> {
    // Get all vehicle IDs in order
    const vehicleIds = await redisClient.zrange(VEHICLES_KEY, 0, -1);
    
    // Get all vehicles in parallel
    const vehicles = await Promise.all(
      vehicleIds.map(id => this.getVehicle(id))
    );
    
    // Filter out any null values and return
    return vehicles.filter((v): v is Vehicle => v !== null);
  },

  // Media operations
  async getMedia(id: string): Promise<Media | null> {
    const key = MEDIA_KEY(id);
    const exists = await redisClient.exists(key);
    
    if (!exists) {
      return null;
    }
    
    const mediaData = await redisClient.hgetall(key);
    if (!mediaData || Object.keys(mediaData).length === 0) {
      return null;
    }
    
    return {
      ...mediaData,
      id: mediaData.id,
      order: parseInt(mediaData.order, 10),
      createdAt: new Date(mediaData.createdAt),
    } as Media;
  },

  async cacheMedia(media: Media, ttl = DEFAULT_TTL): Promise<void> {
    const key = MEDIA_KEY(media.id);
    
    // Convert complex types to strings
    const mediaData = {
      ...media,
      order: media.order.toString(),
      createdAt: media.createdAt.toISOString(),
      vehicleId: media.vehicleId || '',
    };
    
    // Set the media data
    await redisClient.hset(key, mediaData);
    
    // If media is attached to a vehicle, add to vehicle's media set
    if (media.vehicleId) {
      await redisClient.zadd(
        VEHICLE_MEDIA_KEY(media.vehicleId),
        media.order,
        media.id
      );
      await redisClient.expire(VEHICLE_MEDIA_KEY(media.vehicleId), ttl);
    } else {
      // Add to unattached media set
      await redisClient.sadd(UNATTACHED_MEDIA_KEY, media.id);
      await redisClient.expire(UNATTACHED_MEDIA_KEY, ttl);
    }
    
    // Set TTL
    await redisClient.expire(key, ttl);
  },

  async getVehicleMedia(vehicleId: string): Promise<Media[]> {
    // Get all media IDs for the vehicle
    const mediaIds = await redisClient.zrange(VEHICLE_MEDIA_KEY(vehicleId), 0, -1);
    
    // Get all media in parallel
    const mediaItems = await Promise.all(
      mediaIds.map(id => this.getMedia(id))
    );
    
    // Filter out any null values and return sorted by order
    return mediaItems
      .filter((m): m is Media => m !== null)
      .sort((a, b) => a.order - b.order);
  },

  async getUnattachedMedia(): Promise<Media[]> {
    // Get all unattached media IDs
    const mediaIds = await redisClient.smembers(UNATTACHED_MEDIA_KEY);
    
    // Get all media in parallel
    const mediaItems = await Promise.all(
      mediaIds.map(id => this.getMedia(id))
    );
    
    // Filter out any null values and return sorted by creation date
    return mediaItems
      .filter((m): m is Media => m !== null)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  },

  // Cache warming
  async warmCache(vehicles: Vehicle[], mediaItems: Media[]): Promise<void> {
    // Cache all vehicles
    await Promise.all(vehicles.map(vehicle => this.cacheVehicle(vehicle)));
    
    // Cache all media
    await Promise.all(mediaItems.map(media => this.cacheMedia(media)));
  },

  // Clear cache
  async clearCache(): Promise<void> {
    // Note: Be careful with this in production
    const keys = await redisClient.keys('*');
    if (keys.length > 0) {
      await Promise.all(keys.map(key => redisClient.del(key)));
    }
  },
};

export default redisService;
