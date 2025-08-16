import { NextResponse } from 'next/server';
import { redisService } from '@/lib/services/redisService';
import { PrismaClient } from '@/generated/prisma';
import { withAccelerate } from '@prisma/extension-accelerate';
import type { Vehicle } from '@/types';

const prisma = new PrismaClient().$extends(withAccelerate());

// Define a type for the vehicle data we expect from Redis
interface RedisVehicle {
  id?: string;
  stockNumber: string;
  make: string;
  model: string;
  year: number | string;
  price: number | string;
  mileage: number | string;
  color?: string;
  exteriorColor?: string;
  interiorColor?: string;
  vin: string;
  trim: string;
  engine: string;
  transmission: string;
  bodyStyle: string;
  vehicleClass?: string;
  description?: string;
  sourceUrl?: string;
  facebookPostId?: string;
  lastFacebookPostDate?: string;
  lastMarketplacePostDate?: string;
  carfaxHighlights?: unknown;
  isNew?: boolean;
  isFeatured?: boolean;
  isSold?: boolean;
  features?: string[];
  images?: string[];
  salePrice?: string | number;
  pricingDetails?: Record<string, string>;
  status?: 'available' | 'sold';
  lastUpdated?: string;
  createdAt?: string;
  updatedAt?: string;
}

// GET /api/vehicles
export async function GET() {
  try {
    console.log('[API] Fetching inventory data from Redis...');
    // Get the complete inventory data including metadata
    const inventoryData = await redisService.getInventoryData();
    const typedVehicles = inventoryData.vehicles as RedisVehicle[];
    console.log(`[API] Got ${typedVehicles.length} vehicles from Redis`);
    console.log(`[API] Inventory last updated: ${inventoryData.lastUpdated || 'unknown'}`);
    
    if (typedVehicles.length === 0) {
      console.log('[API] No vehicles found in inventory data');
    }
    
    // Ensure all vehicles have an 'id' field that matches their 'stockNumber'
    try {
      console.log('[API] Fetching 360 images from database...');
      const threeSixtyImages = await prisma.threeSixtyImage.findMany();
      console.log(`[API] Found ${threeSixtyImages.length} 360 images`);
      
      const threeSixtyImageMap = new Map(threeSixtyImages.map(img => [img.stockNumber, img.imageUrl]));

      // Type guard to check if an object is a valid vehicle
      const isRedisVehicle = (vehicle: unknown): vehicle is RedisVehicle => {
        return (
          typeof vehicle === 'object' && 
          vehicle !== null && 
          'stockNumber' in vehicle && 
          typeof (vehicle as { stockNumber: unknown }).stockNumber === 'string'
        );
      };

      // Merge vehicle data with 360 image data
      const vehiclesWithAllData = typedVehicles
        .filter(isRedisVehicle) // Filter out any invalid vehicle data
        .map((vehicle: RedisVehicle) => {
          try {
            const parseCurrencyToNumber = (value: unknown): number => {
              if (typeof value === 'number') return value;
              if (typeof value === 'string') {
                const cleaned = value.replace(/[^\d]/g, '');
                return cleaned ? parseInt(cleaned, 10) : 0;
              }
              return 0;
            };

            const parseMileage = (value: unknown): number => {
              if (typeof value === 'number') return value;
              if (typeof value === 'string') {
                const cleaned = value.replace(/[^\d]/g, '');
                return cleaned ? parseInt(cleaned, 10) : 0;
              }
              return 0;
            };

            const parseYear = (value: unknown): number => {
              if (typeof value === 'number') return value;
              if (typeof value === 'string') {
                const cleaned = value.replace(/[^\d]/g, '');
                return cleaned ? parseInt(cleaned, 10) : 0;
              }
              return 0;
            };

            // Create a new object with all required Vehicle interface fields
            const vehicleData: Vehicle = {
              id: vehicle.id || vehicle.stockNumber,
              stockNumber: vehicle.stockNumber,
              make: vehicle.make,
              model: vehicle.model,
              year: parseYear(vehicle.year),
              price: parseCurrencyToNumber(vehicle.price),
              mileage: parseMileage(vehicle.mileage),
              color: vehicle.color || vehicle.exteriorColor || '',
              vin: vehicle.vin,
              trim: vehicle.trim,
              engine: vehicle.engine,
              transmission: vehicle.transmission,
              bodyStyle: vehicle.bodyStyle,
              // Required fields with default values
              features: Array.isArray(vehicle.features) ? vehicle.features : [],
              images: Array.isArray(vehicle.images) ? vehicle.images : [],
              status: vehicle.status || 'available',
              // Optional fields
              salePrice: vehicle.salePrice,
              pricingDetails: vehicle.pricingDetails,
              isNew: vehicle.isNew,
              isFeatured: vehicle.isFeatured,
              isSold: vehicle.isSold,
              threeSixtyImageUrl: threeSixtyImageMap.get(vehicle.stockNumber) || null,
              // Convert string dates to Date objects if they exist
              lastUpdated: vehicle.lastUpdated ? new Date(vehicle.lastUpdated) : undefined,
              createdAt: vehicle.createdAt ? new Date(vehicle.createdAt) : undefined,
              updatedAt: vehicle.updatedAt ? new Date(vehicle.updatedAt) : undefined,
            };
            
            return vehicleData;
          } catch (mapError) {
            console.error('[API] Error processing vehicle:', {
              vehicleId: vehicle?.id,
              stockNumber: vehicle?.stockNumber,
              error: mapError
            });
            return null;
          }
        })
        .filter((v): v is Vehicle => v !== null); // Remove any null entries from failed mappings
      
      console.log(`[API] Successfully processed ${vehiclesWithAllData.length} vehicles`);
      return NextResponse.json(vehiclesWithAllData);
    } catch (dbError) {
      console.error('[API] Database error:', dbError);
      // If DB fails but we have vehicles, return them without 360 images
      if (typedVehicles.length > 0) {
        console.log('[API] Returning vehicles without 360 images due to database error');
        return NextResponse.json(typedVehicles.map((vehicle: RedisVehicle) => ({
          ...vehicle,
          id: vehicle.id || vehicle.stockNumber,
          threeSixtyImageUrl: null,
        })));
      }
      throw dbError; // Re-throw if we have no vehicles to fall back to
    }
  } catch (err) {
    console.error('[API] vehicles GET error:', {
      message: err instanceof Error ? err.message : 'Unknown error',
      stack: err instanceof Error ? err.stack : undefined,
      name: err instanceof Error ? err.name : 'UnknownError'
    });
    
    return new NextResponse(
      JSON.stringify({
        error: 'Failed to load vehicles',
        details: process.env.NODE_ENV === 'development' 
          ? (err instanceof Error ? err.message : 'Unknown error')
          : undefined
      }),
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
  }
}
