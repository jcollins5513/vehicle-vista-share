import { redisClient } from '@/lib/redis';
import type { Vehicle, Media } from '@/types';
import {
  vehicleToRedis,
  mediaToRedis,
  redisToVehicle,
  redisToMedia,
} from '@/lib/types/conversions';

// Error class for Redis operations
class RedisError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RedisError';
  }
}

// Key patterns
const VEHICLE_KEY = (id: string) => `vehicle:${id}`;
const VEHICLES_KEY = 'vehicles:all';
const MEDIA_KEY = (id: string) => `media:${id}`;
const VEHICLE_MEDIA_KEY = (vehicleId: string) => `vehicle:${vehicleId}:media`;
const UNATTACHED_MEDIA_KEY = 'media:unattached';
const SHOWROOM_CACHE_KEY = 'showroom:data';
const INVENTORY_CACHE_KEY = 'dealership:inventory';

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
    
    const vehicleDataStr = await redisClient.get(key);
    if (!vehicleDataStr) {
      return null;
    }
    
    const vehicleData = JSON.parse(vehicleDataStr);
    
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
    
    // Set the vehicle data with TTL
    await redisClient.set(key, JSON.stringify(vehicleData), ttl);
    
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
    
    const mediaData = await redisClient.get(key);
    if (!mediaData) {
      return null;
    }
    
    // Parse and convert the media data
    const parsedData = JSON.parse(mediaData);
    return redisToMedia(parsedData);
  },

  async cacheMedia(media: Media, ttl = DEFAULT_TTL): Promise<void> {
    const key = MEDIA_KEY(media.id);
    
    // Convert Media to Redis-compatible format
    const mediaData = mediaToRedis(media);
    
    // Set the media data with TTL
    await redisClient.set(key, JSON.stringify(mediaData), ttl);
    await redisClient.expire(key, ttl);
    
    // If media is not attached to a vehicle, add to unattached set
    if (!media.vehicleId) {
      await redisClient.sadd(UNATTACHED_MEDIA_KEY, media.id);
    } else {
      // If media is attached to a vehicle, add to vehicle's media set
      await redisClient.sadd(VEHICLE_MEDIA_KEY(media.vehicleId), media.id);
    }
    
    // Set TTL
    await redisClient.expire(key, ttl);
  },

  async getVehicleMedia(vehicleId: string): Promise<Media[]> {
    const mediaIds = await redisClient.smembers(VEHICLE_MEDIA_KEY(vehicleId));
    if (!mediaIds || mediaIds.length === 0) {
      return [];
    }
    
    const mediaPromises = mediaIds.map(id => this.getMedia(id));
    const mediaItems = await Promise.all(mediaPromises);
    
    return mediaItems.filter((m): m is Media => m !== null);
  },

  async getUnattachedMedia(): Promise<Media[]> {
    const mediaIds = await redisClient.smembers(UNATTACHED_MEDIA_KEY);
    if (!mediaIds || mediaIds.length === 0) {
      return [];
    }
    
    const mediaPromises = mediaIds.map(id => this.getMedia(id));
    const mediaItems = await Promise.all(mediaPromises);
    
    return mediaItems.filter((m): m is Media => m !== null);
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
  async getShowroomData(useCache = true): Promise<{
    vehicles: Vehicle[];
    customMedia: Media[];
    cachedAt: number;
    fromCache: boolean;
    error?: string
  }> {
    const cacheKey = SHOWROOM_CACHE_KEY;
    
    try {
      // Check if Redis is available
      if (!redisClient) {
        throw new RedisError('Redis client not available');
      }

      // Try to get from cache if enabled
      if (useCache) {
        try {
          const cachedData = await redisClient.jsonGet<{
            vehicles: Vehicle[];
            customMedia: Media[];
            cachedAt: number;
          }>(cacheKey);
          
          if (cachedData && 
              Array.isArray(cachedData.vehicles) && 
              Array.isArray(cachedData.customMedia) &&
              typeof cachedData.cachedAt === 'number') {
            return { 
              vehicles: cachedData.vehicles, 
              customMedia: cachedData.customMedia, 
              cachedAt: cachedData.cachedAt, 
              fromCache: true 
            };
          }
        } catch (cacheError) {
          console.warn('Cache miss or invalid cache data, fetching fresh data:', cacheError);
          // Continue to fetch fresh data if cache is invalid
        }
      }

      // Get fresh data from Redis
      const [vehicles, customMedia] = await Promise.all([
        this.getVehicles(),
        this.getUnattachedMedia()
      ]);
      
      const result = {
        vehicles: Array.isArray(vehicles) ? vehicles : [],
        customMedia: Array.isArray(customMedia) ? customMedia : [],
        cachedAt: Date.now(),
        fromCache: false
      };

      try {
        // Cache the result with TTL using jsonSet for proper serialization
        await redisClient.jsonSet(cacheKey, result, { ex: DEFAULT_TTL });
      } catch (cacheError) {
        console.error('Failed to cache showroom data:', cacheError);
        // Don't fail the request if caching fails
      }
      
      return result;
    } catch (error) {
      console.error('Error in getShowroomData:', error);
      
      // Return empty data if there's an error
      return {
        vehicles: [],
        customMedia: [],
        cachedAt: Date.now(),
        fromCache: false,
        error: error instanceof Error ? error.message : 'Failed to load showroom data',
      };
    }
  },

  /**
   * Retrieve the raw inventory data scraped from the dealership website.
   */
  async getInventoryData(): Promise<{ vehicles: any[]; lastUpdated?: string }> {

    try {
      const data = await redisClient.get<{ vehicles?: any[]; lastUpdated?: string }>(
        INVENTORY_CACHE_KEY
      );

      if (!data || typeof data !== 'object') {
        return { vehicles: [] };
      }

      return {
        vehicles: Array.isArray(data.vehicles) ? data.vehicles : [],
        lastUpdated: data.lastUpdated,
      };
    } catch (error) {
      console.error('Error fetching inventory data:', error);
      throw new Error('Failed to get inventory data');
    }

  },
};

export default redisService;
