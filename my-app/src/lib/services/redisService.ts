import { redisClient } from '@/lib/redis';
import type { Vehicle, Media } from '@/types';
import {
  toVehicle,
  toMedia,
  vehicleToRedis,
  mediaToRedis,
  redisToVehicle,
  redisToMedia,
} from '@/lib/types/conversions';

// Key patterns
const VEHICLE_KEY = (id: string) => `vehicle:${id}`;
const VEHICLES_KEY = 'vehicles:all';
const MEDIA_KEY = (id: string) => `media:${id}`;
const VEHICLE_MEDIA_KEY = (vehicleId: string) => `vehicle:${vehicleId}:media`;
const UNATTACHED_MEDIA_KEY = 'media:unattached';
const SHOWROOM_CACHE_KEY = 'showroom:data';

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
    
    // Convert Redis hash to Vehicle type
    const vehicle = redisToVehicle(vehicleData);
    
    // Get associated media
    const media = await this.getVehicleMedia(id);
    
    // Create a new object without the media property to satisfy TypeScript
    const { media: _, ...vehicleWithoutMedia } = vehicle as any;
    
    return {
      ...vehicleWithoutMedia,
      media,
    } as Vehicle;
  },

  async cacheVehicle(vehicle: Vehicle, ttl = DEFAULT_TTL): Promise<void> {
    const key = VEHICLE_KEY(vehicle.id);
    
    // Convert Vehicle to Redis-compatible format
    const vehicleData = vehicleToRedis(vehicle);
    
    // Add to vehicles sorted set with timestamp for ordering
    await redisClient.zadd(VEHICLES_KEY, Date.now(), vehicle.id);
    
    // Set the vehicle data
    await redisClient.hmset(key, vehicleData);
    
    // Set TTL
    await redisClient.expire(key, ttl);
    
    // Cache associated media if they exist
    const media = (vehicle as any).media;
    if (media && Array.isArray(media) && media.length > 0) {
      await Promise.all(
        media.map((m: any) => this.cacheMedia(m, ttl))
      );
    }
  },

  async getVehicles(): Promise<Vehicle[]> {
    // Get all vehicle IDs in order with scores
    const vehicleData = await redisClient.zrange(VEHICLES_KEY, 0, -1, true);
    
    if (!vehicleData || vehicleData.length === 0) {
      return [];
    }
    
    // Extract vehicle IDs (every other element when withScores is true)
    const vehicleIds = vehicleData.filter((_, index) => index % 2 === 0);
    
    // Get all vehicles
    const vehicles = await Promise.all(
      vehicleIds.map((id: string) => this.getVehicle(id))
    );
    
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
    
    // Convert Redis hash to Media type
    return redisToMedia(mediaData);
  },

  async cacheMedia(media: Media, ttl = DEFAULT_TTL): Promise<void> {
    const key = MEDIA_KEY(media.id);
    
    // Convert Media to Redis-compatible format
    const mediaData = mediaToRedis(media);
    
    // Set the media data
    await redisClient.hset(key, mediaData);
    
    // If media is attached to a vehicle, add to vehicle's media set
    if (media.vehicleId) {
      await redisClient.zadd(
        VEHICLE_MEDIA_KEY(media.vehicleId),
        media.order,
        media.id,
        { nx: true }
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

  // Get showroom data with Redis caching
  async getShowroomData(useCache = true): Promise<{ vehicles: Vehicle[], customMedia: Media[], cachedAt: number }> {
    const cacheKey = SHOWROOM_CACHE_KEY;
    
    try {
      // Try to get from cache if enabled
      if (useCache) {
        const cachedData = await redisClient.get(cacheKey);
        if (cachedData) {
          return JSON.parse(cachedData);
        }
      }

      // Fall back to database if cache miss or cache disabled
      const { prisma } = await import('@/lib/prisma');
      
      const [vehicles, customMedia] = await Promise.all([
        prisma.vehicle.findMany({
          where: { status: 'available' },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.media.findMany({
          where: { vehicleId: null },
          orderBy: { order: 'asc' },
        }),
      ]);

      // Convert to application types
      const result = {
        vehicles: vehicles.map(v => toVehicle(v)),
        customMedia: customMedia.map(m => toMedia(m)),
        cachedAt: Date.now(),
      };

      // Cache the result
      await redisClient.set(cacheKey, JSON.stringify(result), 60 * 5); // 5 minute TTL
      
      return result;
    } catch (error) {
      console.error('Error getting showroom data:', error);
      throw error;
    }
  },
};

export default redisService;
