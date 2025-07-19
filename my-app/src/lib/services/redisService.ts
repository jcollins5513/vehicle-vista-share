import { redisClient } from '@/lib/redis';
import type { Vehicle, Media } from '@/types';
import {
  vehicleToRedis,
  mediaToRedis,
  redisToVehicle,
  redisToMedia,
} from '@/lib/types/conversions';

// Key patterns
const VEHICLE_KEY = (id: string) => `vehicle:${id}`;
const VEHICLES_KEY = 'vehicles:all';
const DEALERSHIP_INVENTORY_KEY = 'dealership:inventory';
const MEDIA_KEY = (id: string) => `media:${id}`;
const VEHICLE_MEDIA_KEY = (vehicleId: string) => `vehicle:${vehicleId}:media`;
const UNATTACHED_MEDIA_KEY = 'media:unattached';
const SHOWROOM_CACHE_KEY = 'vista:inventory';

// TTL in seconds (0 means no expiration)
const DEFAULT_TTL = 0; // Persistent until explicitly deleted or overwritten

// Keys that should never expire
const PERSISTENT_KEYS = [
  DEALERSHIP_INVENTORY_KEY,
  SHOWROOM_CACHE_KEY,
  VEHICLES_KEY
];

// Helper function to ensure keys persist
async function ensurePersistent(key: string): Promise<void> {
  try {
    await redisClient.persist(key);
  } catch (error) {
    console.warn(`[Redis] Could not set PERSIST on key ${key}:`, error);
  }
}

interface InventoryData {
  vehicles: unknown[];
  lastUpdated?: string;
  cachedAt?: string;
}

interface ShowroomData {
  vehicles: Vehicle[];
  customMedia: Media[];
  cachedAt: number;
  fromCache: boolean;
  error?: string;
}

export const redisService = {
  // Vehicle operations
  async getVehicle(id: string): Promise<Vehicle | null> {
    try {
      // First try to get from vista:inventory key
      const inventoryData = await redisClient.get(DEALERSHIP_INVENTORY_KEY);
      console.log('[getVehicle] Looking for id:', id);
      console.log('[getVehicle] Type of inventoryData:', typeof inventoryData);
      
      let vehicles: unknown[] = [];
      if (inventoryData) {
        try {
          // Handle case when inventoryData is already an object (not a string)
          if (typeof inventoryData === 'object' && inventoryData !== null) {
            const typedData = inventoryData as { vehicles?: unknown[] };
            vehicles = Array.isArray(typedData.vehicles) ? typedData.vehicles : [];
          } 
          // Handle case when inventoryData is a string that needs parsing
          else if (typeof inventoryData === 'string') {
            const parsedData = JSON.parse(inventoryData);
            vehicles = Array.isArray(parsedData.vehicles) ? parsedData.vehicles : [];
          }
          if (vehicles.length > 0) {
            console.log('[getVehicle] First 3 vehicle ids:', vehicles.slice(0, 3).map((v: any) => v.id));
          } else {
            console.log('[getVehicle] No vehicles found in inventoryData');
          }
          // Find the vehicle with matching id
          const vehicle = vehicles.find((v: any) => v.id === id || v.stockNumber === id);
          if (!vehicle) {
            console.log(
              '[getVehicle] No match found for id:',
              id,
              'in',
              (Array.isArray(vehicles) ? vehicles : []).map(v =>
                v && typeof v === 'object' && v !== null && 'id' in v
                  ? (v as { id?: string }).id ?? '[no id]'
                  : '[no id]'
              )
            );
          } else {
            console.log(
              '[getVehicle] Found vehicle:',
              (vehicle && typeof vehicle === 'object' && 'id' in vehicle)
                ? (vehicle as { id?: string }).id ?? '[no id]'
                : '[no id]'
            );
            return vehicle as Vehicle;
          }
        } catch (parseError) {
          console.error('[Redis] Error parsing vista:inventory data in getVehicle:', parseError);
        }
      }
      // Fallback to original method
      const key = VEHICLE_KEY(id);
      const exists = await redisClient.exists(key);
      if (!exists) {
        console.log('[getVehicle] No individual vehicle key found for:', key);
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
    } catch (error) {
      console.error('[Redis] Error in getVehicle:', error);
      return null;
    }
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
      // First try to get vehicles from vista:inventory key
      const inventoryData = await redisClient.get(DEALERSHIP_INVENTORY_KEY);
      
      if (inventoryData) {
        try {
          // Handle case when inventoryData is already an object (not a string)
          if (typeof inventoryData === 'object' && inventoryData !== null) {
            // Type assertion to help TypeScript understand the structure
              const typedData = inventoryData as { vehicles?: unknown[] };
            if (Array.isArray(typedData.vehicles) && typedData.vehicles.length > 0) {
              console.log(`[Redis] Found ${typedData.vehicles.length} vehicles in vista:inventory (object)`);
              return typedData.vehicles as Vehicle[];
            }
          } 
          // Handle case when inventoryData is a string that needs parsing
          else if (typeof inventoryData === 'string') {
            const parsedData = JSON.parse(inventoryData);
            if (parsedData && Array.isArray(parsedData.vehicles) && parsedData.vehicles.length > 0) {
              console.log(`[Redis] Found ${parsedData.vehicles.length} vehicles in vista:inventory (parsed)`);
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
          console.error('[Redis] Error parsing vista:inventory data:', parseError);
        }
      }
      
      // Fallback to original method if vista:inventory doesn't exist or is empty
      console.log('[Redis] No vehicles found in vista:inventory, falling back to vehicles:all');
      
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
  async getShowroomData(useCache = true): Promise<ShowroomData> {
    console.log('[RedisService] getShowroomData called, useCache:', useCache);
    const cacheKey = SHOWROOM_CACHE_KEY;

    try {
      // Always try to get from cache first if useCache is true
      if (useCache) {
        try {
          const cachedData = await redisClient.get(SHOWROOM_CACHE_KEY);
          if (cachedData) {
            const parsedData = typeof cachedData === 'string' 
              ? JSON.parse(cachedData) 
              : cachedData;
              
            if (parsedData && Array.isArray(parsedData.vehicles)) {
              console.log('[Redis] Using cached showroom data');
              return {
                vehicles: parsedData.vehicles,
                customMedia: parsedData.customMedia || [],
                cachedAt: parsedData.cachedAt || Date.now(),
                fromCache: true
              };
            }
          }
        } catch (error) {
          console.error('[Redis] Error getting/parsing cached showroom data:', error);
          // Continue to fetch fresh data if cache access fails
        }
      }

      // If we get here, either cache is disabled or no valid cache exists
      console.log('[Redis] Fetching fresh showroom data');
      const vehicles = await this.getVehicles();
      const customMedia = await this.getUnattachedMedia();
      
      // Cache the result with no TTL for persistent storage
      const cacheData = {
        vehicles,
        customMedia,
        cachedAt: Date.now(),
        fromCache: false
      };

      try {
        console.log('[Redis] Caching showroom data without TTL');
        // Use set without TTL for persistent storage
        await redisClient.set(SHOWROOM_CACHE_KEY, cacheData);
    console.log('[Redis] Fetching inventory data from Redis');
    // Get the inventory data from Redis
    const inventoryData = await redisClient.get(DEALERSHIP_INVENTORY_KEY);
    
    if (!inventoryData) {
      console.log('[Redis] No inventory data found in Redis');
      return { vehicles: [] };
    }

    // Parse the inventory data
    let parsedData: { vehicles: unknown[]; lastUpdated?: string };
    try {
      parsedData = typeof inventoryData === 'string' 
        ? JSON.parse(inventoryData) 
        : inventoryData;
        
      console.log(`[Redis] Retrieved ${Array.isArray(parsedData.vehicles) ? parsedData.vehicles.length : 0} vehicles from inventory`);
    } catch (parseError) {
      console.error('[Redis] Error parsing inventory data:', parseError);
      return { vehicles: [] };
    }

    // Ensure we have a valid vehicles array
    if (!Array.isArray(parsedData.vehicles)) {
      console.warn('[Redis] Invalid vehicles data in inventory:', parsedData);
      return { vehicles: [] };
    }

    // Verify the data is still in Redis (for debugging)
    try {
      const exists = await redisClient.exists(DEALERSHIP_INVENTORY_KEY);
      console.log(`[Redis] Inventory data ${exists ? 'exists' : 'does not exist'} in Redis`);
    } catch (checkError) {
      console.warn('[Redis] Error checking inventory data existence:', checkError);
    }

    return {
      vehicles: parsedData.vehicles,
      lastUpdated: parsedData.lastUpdated
    };
  } catch (error) {
    console.error('[Redis] Error in getInventoryData:', error);
    return { vehicles: [] };
  }
},

/**
 * Store inventory data in Redis with no expiration
 */
async cacheInventoryData(vehicles: unknown[], lastUpdated?: string): Promise<void> {
  try {
    console.log(`[Redis] Caching ${vehicles.length} vehicles in inventory`);
    const dataToCache = {
      vehicles,
      lastUpdated: lastUpdated || new Date().toISOString(),
      cachedAt: new Date().toISOString()
    };
    
    // Store without TTL for persistent storage
    await redisClient.set(DEALERSHIP_INVENTORY_KEY, dataToCache);
    
    // Ensure the key is marked as persistent
    try {
      await redisClient.persist(DEALERSHIP_INVENTORY_KEY);
      console.log('[Redis] Inventory data cached successfully with no TTL');
    } catch (persistError) {
      console.warn('[Redis] Could not set PERSIST on inventory key:', persistError);
    }
    
    // Also update the vehicles sorted set
    try {
      await redisClient.del(VEHICLES_KEY); // Clear existing set
      if (vehicles.length > 0) {
        const vehicleIds = vehicles.map((v: any) => v.id || v.stockNumber).filter(Boolean);
        if (vehicleIds.length > 0) {
          const args = vehicleIds.flatMap(id => [0, id]);
          await redisClient.zadd(VEHICLES_KEY, ...args);
          await redisClient.persist(VEHICLES_KEY);
        }
      }
    } catch (setError) {
      console.error('[Redis] Error updating vehicles sorted set:', setError);
    }
  } catch (error) {
    console.error('[Redis] Error in cacheInventoryData:', error);
    throw error;
  }
},

export default redisService;
