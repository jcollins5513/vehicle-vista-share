import { redisClient } from '@/lib/redis';
import type { Vehicle, Media } from '@/types';
import { vehicleToRedis, redisToVehicle } from '@/lib/types/conversions';

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

// Define the RedisService interface
export interface IRedisService {
  // Vehicle operations
  getVehicle(id: string): Promise<Vehicle | null>;
  cacheVehicle(vehicle: Vehicle, ttl?: number): Promise<void>;
  getVehicles(): Promise<Vehicle[]>;
  
  // Media operations
  getMedia(id: string): Promise<Media | null>;
  cacheMedia(media: Media, ttl?: number): Promise<void>;
  getVehicleMedia(vehicleId: string): Promise<Media[]>;
  getUnattachedMedia(): Promise<Media[]>;
  
  // Cache operations
  warmCache(vehicles: Vehicle[], mediaItems: Media[]): Promise<void>;
  clearCache(): Promise<void>;
  
  // Inventory operations
  getShowroomData(useCache?: boolean): Promise<ShowroomData>;
  getInventoryData(): Promise<InventoryData>;
  cacheInventoryData(vehicles: unknown[], lastUpdated?: string): Promise<void>;
}

// Implement the Redis service
class RedisService implements IRedisService {
  // Vehicle operations
  async getVehicle(id: string): Promise<Vehicle | null> {
    try {
      const data = await redisClient.get(VEHICLE_KEY(id));
      if (!data) return null;
      // Parse the JSON string to an object before passing to redisToVehicle
      const parsedData = typeof data === 'string' ? JSON.parse(data) : data;
      return redisToVehicle(parsedData);
    } catch (error) {
      console.error(`[Redis] Error getting vehicle ${id}:`, error);
      return null;
    }
  }

  async cacheVehicle(vehicle: Vehicle, ttl: number = DEFAULT_TTL): Promise<void> {
    try {
      const key = VEHICLE_KEY(vehicle.id);
      await redisClient.set(key, vehicleToRedis(vehicle));
      if (ttl > 0) {
        await redisClient.expire(key, ttl);
      } else {
        await ensurePersistent(key);
      }
    } catch (error) {
      console.error(`[Redis] Error caching vehicle ${vehicle.id}:`, error);
      throw error;
    }
  }

  async getVehicles(): Promise<Vehicle[]> {
    try {
      const vehicleIds = await redisClient.smembers(VEHICLES_KEY);
      const vehicles = await Promise.all(
        vehicleIds.map(id => this.getVehicle(id))
      );
      return vehicles.filter((v): v is Vehicle => v !== null);
    } catch (error) {
      console.error('[Redis] Error getting vehicles:', error);
      return [];
    }
  }

  // Media operations
  async getMedia(id: string): Promise<Media | null> {
    try {
      const data = await redisClient.get(MEDIA_KEY(id));
      return data as Media | null;
    } catch (error) {
      console.error(`[Redis] Error getting media ${id}:`, error);
      return null;
    }
  }

  async cacheMedia(media: Media, ttl: number = DEFAULT_TTL): Promise<void> {
    try {
      const key = MEDIA_KEY(media.id);
      await redisClient.set(key, media);
      if (ttl > 0) {
        await redisClient.expire(key, ttl);
      } else {
        await ensurePersistent(key);
      }
    } catch (error) {
      console.error(`[Redis] Error caching media ${media.id}:`, error);
      throw error;
    }
  }

  async getVehicleMedia(vehicleId: string): Promise<Media[]> {
    try {
      const mediaIds = await redisClient.smembers(VEHICLE_MEDIA_KEY(vehicleId));
      const media = await Promise.all(mediaIds.map(id => this.getMedia(id)));
      return media.filter((m): m is Media => m !== null);
    } catch (error) {
      console.error(`[Redis] Error getting media for vehicle ${vehicleId}:`, error);
      return [];
    }
  }

  async getUnattachedMedia(): Promise<Media[]> {
    try {
      const mediaIds = await redisClient.smembers(UNATTACHED_MEDIA_KEY);
      const media = await Promise.all(mediaIds.map(id => this.getMedia(id)));
      return media.filter((m): m is Media => m !== null);
    } catch (error) {
      console.error('[Redis] Error getting unattached media:', error);
      return [];
    }
  }

  // Cache operations
  async warmCache(vehicles: Vehicle[], mediaItems: Media[]): Promise<void> {
    try {
      await Promise.all([
        ...vehicles.map(v => this.cacheVehicle(v)),
        ...mediaItems.map(m => this.cacheMedia(m))
      ]);
    } catch (error) {
      console.error('[Redis] Error warming cache:', error);
      throw error;
    }
  }

  async clearCache(): Promise<void> {
    try {
      await redisClient.flushdb();
    } catch (error) {
      console.error('[Redis] Error clearing cache:', error);
      throw error;
    }
  }

  // Inventory operations
  async getShowroomData(useCache: boolean = true): Promise<ShowroomData> {
    const defaultResponse: ShowroomData = {
      vehicles: [],
      customMedia: [],
      cachedAt: Date.now(),
      fromCache: false
    };

    try {
      if (useCache) {
        const cachedData = await redisClient.get<ShowroomData>(SHOWROOM_CACHE_KEY);
        if (cachedData) {
          return { ...cachedData, fromCache: true };
        }
      }

      // If no cache or cache disabled, return default empty response
      // The actual data loading should be handled by the caller
      return defaultResponse;
    } catch (error) {
      console.error('[Redis] Error in getShowroomData:', error);
      return { ...defaultResponse, error: 'Failed to load showroom data' };
    }
  }

  async getInventoryData(): Promise<InventoryData> {
    try {
      console.log('[Redis] Fetching inventory data from Redis');
      const inventoryData = await redisClient.get<InventoryData>(DEALERSHIP_INVENTORY_KEY);
      
      if (!inventoryData) {
        console.log('[Redis] No inventory data found in Redis');
        return { vehicles: [] };
      }

      // Ensure we have a valid vehicles array
      if (!Array.isArray(inventoryData.vehicles)) {
        console.warn('[Redis] Invalid vehicles data in inventory:', inventoryData);
        return { vehicles: [] };
      }

      return {
        vehicles: inventoryData.vehicles,
        lastUpdated: inventoryData.lastUpdated,
        cachedAt: inventoryData.cachedAt || new Date().toISOString()
      };
    } catch (error) {
      console.error('[Redis] Error in getInventoryData:', error);
      return { vehicles: [] };
    }
  }

  async cacheInventoryData(vehicles: unknown[], lastUpdated?: string): Promise<void> {
    try {
      console.log(`[Redis] Caching ${vehicles.length} vehicles in inventory`);
      const dataToCache: InventoryData = {
        vehicles,
        lastUpdated: lastUpdated || new Date().toISOString(),
        cachedAt: new Date().toISOString()
      };
      
      // Store without TTL for persistent storage
      await redisClient.set(DEALERSHIP_INVENTORY_KEY, dataToCache);
      
      // Ensure the key is marked as persistent
      await ensurePersistent(DEALERSHIP_INVENTORY_KEY);
      console.log('[Redis] Inventory data cached successfully with no TTL');
      
      // Also update the vehicles sorted set
      await redisClient.del(VEHICLES_KEY); // Clear existing set
      
      if (vehicles.length > 0) {
        // Safely extract vehicle IDs with type checking
        const vehicleIds = vehicles
          .filter((v): v is { id?: string; stockNumber?: string } => 
            typeof v === 'object' && v !== null
          )
          .map(v => v.id || v.stockNumber)
          .filter((id): id is string => Boolean(id));
        
        if (vehicleIds.length > 0) {
          // Add all vehicles to the set
          await redisClient.sadd(VEHICLES_KEY, ...vehicleIds);
          await ensurePersistent(VEHICLES_KEY);
        }
      }
    } catch (error) {
      console.error('[Redis] Error in cacheInventoryData:', error);
      throw error;
    }
  }
}

// Create and export a singleton instance
export const redisService = new RedisService();
export default redisService;
