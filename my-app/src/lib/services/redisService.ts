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
  cachedAt: string; // Changed from number to string to match ISO string format
  fromCache: boolean;
  lastUpdated?: string;
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
  setInventoryData(inventoryData: InventoryData, ttlSeconds?: number): Promise<void>;
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
      console.log('[Redis] Fetching all vehicles...');
      
      // First try to get all vehicles at once if they're stored as a list
      const allVehicles = await redisClient.get(VEHICLES_KEY);
      if (allVehicles) {
        try {
          console.log('[Redis] Found vehicles in list format, parsing...');
          const parsed = typeof allVehicles === 'string' ? JSON.parse(allVehicles) : allVehicles;
          if (Array.isArray(parsed)) {
            console.log(`[Redis] Successfully parsed ${parsed.length} vehicles from list`);
            return parsed;
          }
        } catch (e) {
          console.warn('[Redis] Failed to parse vehicles list, falling back to individual lookups', e);
        }
      }
      
      // If we get here, either the list wasn't found or parsing failed
      // Try to get vehicle IDs from the set
      console.log('[Redis] Fetching vehicle IDs from set...');
      const vehicleIds = await redisClient.smembers(VEHICLES_KEY);
      console.log(`[Redis] Found ${vehicleIds.length} vehicle IDs in set`);
      
      if (vehicleIds.length === 0) {
        console.log('[Redis] No vehicle IDs found in set, checking inventory data...');
        // Try to get vehicles from inventory data as a last resort
        const inventoryData = await this.getInventoryData();
        if (inventoryData.vehicles && inventoryData.vehicles.length > 0) {
          console.log(`[Redis] Found ${inventoryData.vehicles.length} vehicles in inventory data`);
          // Convert inventory vehicles to proper Vehicle format if needed
          return inventoryData.vehicles.map((v: any) => ({
            id: v.id || v.stockNumber,
            stockNumber: v.stockNumber || v.id,
            // Add other required fields with defaults
            make: v.make || '',
            model: v.model || '',
            year: v.year || new Date().getFullYear(),
            // Add other fields with appropriate defaults
            ...v
          }));
        }
        return [];
      }
      
      // Fetch each vehicle individually
      console.log(`[Redis] Fetching ${vehicleIds.length} individual vehicles...`);
      const vehicles = await Promise.all(vehicleIds.map(id => this.getVehicle(id)));
      const validVehicles = vehicles.filter((v): v is Vehicle => v !== null);
      
      console.log(`[Redis] Successfully retrieved ${validVehicles.length} valid vehicles`);
      return validVehicles;
    } catch (error) {
      console.error('[Redis] Error in getVehicles:', error);
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
      console.log(`[Redis] Warming cache with ${vehicles.length} vehicles and ${mediaItems.length} media items`);
      
      // Cache all vehicles
      await Promise.all(vehicles.map(v => this.cacheVehicle(v)));
      
      // Update the vehicles:all set with all vehicle IDs
      if (vehicles.length > 0) {
        const vehicleIds = vehicles.map(v => v.id);
        console.log(`[Redis] Updating vehicles:all set with ${vehicleIds.length} vehicle IDs`);
        await redisClient.sadd(VEHICLES_KEY, ...vehicleIds);
        await ensurePersistent(VEHICLES_KEY);
      }
      
      // Cache all media items
      await Promise.all(mediaItems.map(m => this.cacheMedia(m)));
      
      console.log('[Redis] Cache warm-up completed successfully');
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
  // Debug method to log Redis key information
  async logAllKeys(): Promise<void> {
    try {
      // For Upstash Redis, we'll use SCAN which is safer than KEYS *
      // First, try to get the inventory data directly
      const inventoryData = await redisClient.get(DEALERSHIP_INVENTORY_KEY);
      console.log(`[Redis] Inventory data type:`, typeof inventoryData);
      
      if (inventoryData) {
        console.log(`[Redis] Inventory data exists, length:`, 
          typeof inventoryData === 'string' ? inventoryData.length : 'object');
      } else {
        console.log('[Redis] No inventory data found');
      }
      
      // Also check if we can get vehicle count
      try {
        const vehicleCount = await redisClient.zcard(VEHICLES_KEY);
        console.log(`[Redis] Vehicles sorted set count:`, vehicleCount);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.log('[Redis] Could not get vehicles sorted set:', errorMessage);
      }
    } catch (error) {
      console.error('[Redis] Error checking keys:', error);
    }
  }

  async getShowroomData(useCache: boolean = true): Promise<ShowroomData> {
    const defaultResponse: ShowroomData = {
      vehicles: [],
      customMedia: [],
      cachedAt: new Date().toISOString(),
      fromCache: false
    };

    try {
      console.log(`[Redis] getShowroomData called with useCache=${useCache}`);
      
      // Always try to get fresh inventory data first
      console.log('[Redis] Fetching fresh inventory data...');
      const inventoryData = await this.getInventoryData();
      
      // If we have inventory data, use it
      if (inventoryData.vehicles && inventoryData.vehicles.length > 0) {
        console.log(`[Redis] Found ${inventoryData.vehicles.length} vehicles in inventory data`);
        console.log(`[Redis] Inventory last updated: ${inventoryData.lastUpdated || 'unknown'}`);
        
        const result = {
          vehicles: inventoryData.vehicles as Vehicle[],
          customMedia: [],
          cachedAt: new Date().toISOString(),
          fromCache: false,
          lastUpdated: inventoryData.lastUpdated
        };
        
        console.log('[Redis] Returning fresh inventory data');
        return result;
      }
      
      // If no inventory data but cache is requested, try to get from cache
      if (useCache) {
        console.log('[Redis] No inventory data found, trying cache...');
        const cachedData = await redisClient.get<ShowroomData>(DEALERSHIP_INVENTORY_KEY);
        if (cachedData) {
          console.log(`[Redis] Found cached data with ${cachedData.vehicles?.length || 0} vehicles`);
          console.log(`[Redis] Cached data last updated: ${cachedData.lastUpdated || 'unknown'}`);
          return { ...cachedData, fromCache: true };
        }
      }

      // If we get here, return empty response
      console.log('[Redis] No inventory or cached data available');
      return defaultResponse;
    } catch (error) {
      console.error('[Redis] Error in getShowroomData:', error);
      return { ...defaultResponse, error: 'Failed to load showroom data' };
    }
  }

  async getInventoryData(forceFresh: boolean = false): Promise<InventoryData> {
    try {
      console.log(`[Redis] [${new Date().toISOString()}] Fetching inventory data from Redis with key: ${DEALERSHIP_INVENTORY_KEY}, forceFresh: ${forceFresh}`);
      
      // If forceFresh is true, skip the cache and return empty data to trigger a refresh
      if (forceFresh) {
        console.log(`[Redis] [${new Date().toISOString()}] Force fresh requested, skipping cache`);
        return { vehicles: [] };
      }
      
      // First try to get the raw data
      const rawData = await redisClient.get<InventoryData | string>(DEALERSHIP_INVENTORY_KEY);
      
      console.log(`[Redis] [${new Date().toISOString()}] Raw data type from Redis:`, typeof rawData);
      
      if (!rawData) {
        console.log(`[Redis] [${new Date().toISOString()}] No inventory data found in Redis`);
        return { vehicles: [] };
      }
      
      // Log additional debug info about the raw data
      if (typeof rawData === 'string') {
        console.log(`[Redis] [${new Date().toISOString()}] Raw data length:`, rawData.length);
        console.log(`[Redis] [${new Date().toISOString()}] First 200 chars of raw data:`, rawData.substring(0, 200));
      } else {
        console.log(`[Redis] [${new Date().toISOString()}] Raw data is already parsed as object`);
        console.log(`[Redis] [${new Date().toISOString()}] Raw data keys:`, Object.keys(rawData));
      }

      let inventoryData: InventoryData;
      
      // If we got a string, try to parse it as JSON
      if (typeof rawData === 'string') {
        try {
          inventoryData = JSON.parse(rawData);
        } catch (error) {
          console.error('[Redis] Error parsing inventory data as JSON:', error);
          return { vehicles: [] };
        }
      } else {
        // If it's already an object, use it directly
        inventoryData = rawData as unknown as InventoryData;
      }

      // Ensure we have a valid vehicles array
      if (!inventoryData.vehicles || !Array.isArray(inventoryData.vehicles)) {
        console.warn('[Redis] Invalid or missing vehicles array in inventory data');
        return { vehicles: [] };
      }

      // Log the data we found
      const sampleVehicle = inventoryData.vehicles[0] as Vehicle | undefined;
      console.log(`[Redis] Inventory data from Redis:`, {
        vehiclesCount: inventoryData.vehicles.length,
        lastUpdated: inventoryData.lastUpdated,
        cachedAt: inventoryData.cachedAt,
        sampleVehicle: sampleVehicle ? {
          id: sampleVehicle.id,
          stockNumber: sampleVehicle.stockNumber,
          make: sampleVehicle.make,
          model: sampleVehicle.model,
          year: sampleVehicle.year
        } : 'No vehicles in data'
      });

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

  async cacheInventoryData(vehicles: unknown[], lastUpdated?: string, ttlSeconds?: number): Promise<void> {
    try {
      console.log(`[Redis] Caching ${vehicles.length} vehicles in inventory`);
      const dataToCache: InventoryData = {
        vehicles,
        lastUpdated: lastUpdated || new Date().toISOString(),
        cachedAt: new Date().toISOString()
      };
      
      await this.setInventoryData(dataToCache, ttlSeconds);
    } catch (error) {
      console.error('[Redis] Error in cacheInventoryData:', error);
      throw error;
    }
  }

  async setInventoryData(inventoryData: InventoryData, ttlSeconds?: number): Promise<void> {
    try {
      console.log(`[Redis] Setting inventory data with ${inventoryData.vehicles.length} vehicles`);
      
      // Store with TTL if provided, otherwise make it persistent
      if (ttlSeconds && ttlSeconds > 0) {
        await redisClient.set(DEALERSHIP_INVENTORY_KEY, inventoryData, { ex: ttlSeconds });
        console.log(`[Redis] Inventory data set with TTL of ${ttlSeconds} seconds`);
      } else {
        // Store without TTL for persistent storage
        await redisClient.set(DEALERSHIP_INVENTORY_KEY, inventoryData);
        
        // Ensure the key is marked as persistent
        await ensurePersistent(DEALERSHIP_INVENTORY_KEY);
        console.log('[Redis] Inventory data set with no TTL (persistent)');
      }
      
      // Also update the vehicles sorted set
      await redisClient.del(VEHICLES_KEY); // Clear existing set
      
      if (inventoryData.vehicles.length > 0) {
        // Safely extract vehicle IDs with type checking
        const vehicleIds = inventoryData.vehicles
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
      console.error('[Redis] Error in setInventoryData:', error);
      throw error;
    }
  }
}

// Create and export a singleton instance
export const redisService = new RedisService();
export default redisService;
