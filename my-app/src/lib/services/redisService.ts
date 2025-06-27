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
const VEHICLES_KEY = 'vehicles:all'; // Original key for sorted set of vehicle IDs
const DEALERSHIP_INVENTORY_KEY = 'dealership:inventory'; // Primary key for inventory data
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
    
    const vehicleData = await redisClient.get(key);
    if (!vehicleData || typeof vehicleData !== 'object') {
      console.warn(`[RedisService] Invalid vehicle data for key ${key}:`, vehicleData);
      return null;
    }
    
    // Convert Redis hash to Vehicle type
    const vehicle = redisToVehicle(vehicleData);
    
    // Get associated media
    const media = await this.getVehicleMedia(id);
    
    // Create a new object without the media property to satisfy TypeScript
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { media: _ignored, ...vehicleWithoutMedia } =
      vehicle as Vehicle & { media?: unknown };
    
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
    const media = (vehicle as Vehicle & { media?: Media[] }).media;
    if (media && Array.isArray(media) && media.length > 0) {
      await Promise.all(
          media.map((m: Media) => this.cacheMedia(m, ttl))
      );
    }
  },

  async getVehicles(): Promise<Vehicle[]> {
    try {
      // First try to get vehicles from dealership:inventory key
      const inventoryData = await redisClient.get(DEALERSHIP_INVENTORY_KEY);
      
      if (inventoryData) {
        try {
          // Handle case when inventoryData is already an object (not a string)
          if (typeof inventoryData === 'object' && inventoryData !== null) {
            // Type assertion to help TypeScript understand the structure
              const typedData = inventoryData as { vehicles?: unknown[] };
            if (Array.isArray(typedData.vehicles) && typedData.vehicles.length > 0) {
              console.log(`[Redis] Found ${typedData.vehicles.length} vehicles in dealership:inventory (object)`);
              return typedData.vehicles;
            }
          } 
          // Handle case when inventoryData is a string that needs parsing
          else if (typeof inventoryData === 'string') {
            const parsedData = JSON.parse(inventoryData);
            if (parsedData && Array.isArray(parsedData.vehicles) && parsedData.vehicles.length > 0) {
              console.log(`[Redis] Found ${parsedData.vehicles.length} vehicles in dealership:inventory (parsed)`);
              return parsedData.vehicles;
            }
          }
          // Log what we actually received for debugging
          console.log('[Redis] Inventory data type:', typeof inventoryData);
          console.log('[Redis] Inventory data structure:', 
            typeof inventoryData === 'object' ? 
              Object.keys(inventoryData || {}) : 
              'non-object');
        } catch (parseError) {
          console.error('[Redis] Error parsing dealership:inventory data:', parseError);
        }
      }
      
      // Fallback to original method if dealership:inventory doesn't exist or is empty
      console.log('[Redis] No vehicles found in dealership:inventory, falling back to vehicles:all');
      
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
    } catch (error) {
      console.error('[Redis] Error fetching vehicles:', error);
      return [];
    }
  },

  // Media operations
  async getMedia(id: string): Promise<Media | null> {
    const key = MEDIA_KEY(id);
    const exists = await redisClient.exists(key);
    
    if (!exists) {
      return null;
    }
    
    const mediaData = await redisClient.get(key);
    if (!mediaData || typeof mediaData !== 'object') {
      console.warn(`[RedisService] Invalid media data for key ${key}:`, mediaData);
      return null;
    }
    
    // Convert the media data (already parsed by redisClient.get)
    return redisToMedia(mediaData);
  },

  async cacheMedia(media: Media, ttl = DEFAULT_TTL): Promise<void> {
    const key = MEDIA_KEY(media.id);
    
    // Convert Media to Redis-compatible format
    const mediaData = mediaToRedis(media);
    
    // Set the media data with TTL
    await redisClient.set(key, JSON.stringify(mediaData), {
      ex: ttl // Set TTL in seconds using the ex option (lowercase)
    });
    
    // If media is not attached to a vehicle, add to unattached set
    if (!media.vehicleId) {
      await redisClient.sadd(UNATTACHED_MEDIA_KEY, media.id);
    } else {
      // If media is attached to a vehicle, add to vehicle's media set
      await redisClient.sadd(VEHICLE_MEDIA_KEY(media.vehicleId), media.id);
    }
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
  async getShowroomData(useCache = false): Promise<{
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
              typeof cachedData.cachedAt === 'number' &&
              cachedData.vehicles.length > 0) { // Only use cache if it has vehicles
            console.log('[Redis Debug] Using cached showroom data with', cachedData.vehicles.length, 'vehicles');
            return { 
              vehicles: cachedData.vehicles, 
              customMedia: cachedData.customMedia, 
              cachedAt: cachedData.cachedAt, 
              fromCache: true 
            };
          } else {
            console.log('[Redis Debug] Cache miss or invalid cache data, fetching fresh data');
          }
        } catch (cacheError) {
          console.warn('[Redis Debug] Cache miss or invalid cache data, fetching fresh data:', cacheError);
          // Continue to fetch fresh data if cache is invalid
        }
      } else {
        console.log('[Redis Debug] Skipping cache as requested, fetching fresh data');
      }

      // Get fresh data from Redis
      console.log('[Redis Debug] Fetching fresh data for showroom');
      const vehiclesPromise = this.getVehicles();
      const mediaPromise = this.getUnattachedMedia();
      
      const [vehicles, customMedia] = await Promise.all([vehiclesPromise, mediaPromise]);
      
      console.log('[Redis Debug] Vehicles fetched:', vehicles ? vehicles.length : 0, 'vehicles');
      console.log('[Redis Debug] First vehicle:', vehicles && vehicles.length > 0 ? JSON.stringify(vehicles[0]) : 'None');
      console.log('[Redis Debug] Media fetched:', customMedia ? customMedia.length : 0, 'items');
      
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
        console.error('[Redis Debug] Failed to cache showroom data:', cacheError);
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
  async getInventoryData(): Promise<{ vehicles: unknown[]; lastUpdated?: string }> {
    try {
      const data = await redisClient.get(DEALERSHIP_INVENTORY_KEY);
      if (!data) {
        return { vehicles: [] };
      }

      // If data is neither an object nor a string, something unexpected happened.
      // This check is for robustness, though redisClient.get should return object/string/null.
      if (typeof data !== 'object' && typeof data !== 'string') {
        console.warn(`[RedisService] Unexpected data type for inventory key ${DEALERSHIP_INVENTORY_KEY}:`, typeof data);
        return { vehicles: [] };
      }

      // Handle case when data is already an object (not a string)
      if (typeof data === 'object' && data !== null) {
        console.log('[Redis] Inventory data is already an object');
        // Type assertion to help TypeScript understand the structure
        const typedData = data as { vehicles?: unknown[], lastUpdated?: string };
        return {
          vehicles: Array.isArray(typedData.vehicles) ? typedData.vehicles : [],
          lastUpdated: typedData.lastUpdated,
        };
      } 
      // Handle case when data is a string that needs parsing
      else if (typeof data === 'string') {
        try {
          const parsedData = JSON.parse(data);
          return {
            vehicles: Array.isArray(parsedData.vehicles) ? parsedData.vehicles : [],
            lastUpdated: parsedData.lastUpdated,
          };
        } catch (parseError) {
          console.error('[Redis] Error parsing inventory data:', parseError);
          return { vehicles: [] };
        }
      }
      
      // Log what we actually received for debugging
      console.log('[Redis] Inventory data type:', typeof data);
      console.log('[Redis] Inventory data structure:', 
        typeof data === 'object' ? Object.keys(data || {}) : 'non-object');
      
      return { vehicles: [] };
    } catch (error) {
      console.error('[Redis] Error getting inventory data:', error);
      return { vehicles: [] };
    }
  },
};

export default redisService;
