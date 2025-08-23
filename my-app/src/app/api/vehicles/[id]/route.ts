import { NextResponse } from 'next/server';
import { redisService } from '@/lib/services/redisService';

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

// GET /api/vehicles/[id] - id can be stockNumber or vehicle id
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    console.log(`[API] Fetching vehicle data for id: ${id}`);
    
    // Get the complete inventory data from Redis
    const inventoryData = await redisService.getInventoryData();
    const typedVehicles = inventoryData.vehicles as RedisVehicle[];
    
    // Find the specific vehicle by stock number or id
    const vehicle = typedVehicles.find(v => 
      v.stockNumber === id || v.id === id
    );
    
    if (!vehicle) {
      console.log(`[API] Vehicle not found: ${id}`);
      return new NextResponse(
        JSON.stringify({
          error: 'Vehicle not found',
          id
        }),
        { 
          status: 404,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
    }
    
    console.log(`[API] Found vehicle: ${vehicle.stockNumber} with ${vehicle.images?.length || 0} images`);
    
    // Return the vehicle data
    return NextResponse.json({
      ...vehicle,
      id: vehicle.id || vehicle.stockNumber,
    });
  } catch (err) {
    console.error('[API] vehicle GET error:', {
      message: err instanceof Error ? err.message : 'Unknown error',
      stack: err instanceof Error ? err.stack : undefined,
      name: err instanceof Error ? err.name : 'UnknownError'
    });
    
    return new NextResponse(
      JSON.stringify({
        error: 'Failed to load vehicle',
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