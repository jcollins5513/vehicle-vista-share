import { redisService } from "@/lib/services/redisService";
import InventoryCarousel from "@/components/InventoryCarousel";

// Disable all caching for this route
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Add cache control headers
export function generateMetadata() {
  return {
    headers: {
      'Cache-Control': 'no-store, max-age=0',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  };
}

async function getShowroomData() {
  // Add a version parameter to prevent caching
  const version = Date.now();
  try {
    // Log all Redis keys for debugging
    await redisService.logAllKeys();
    console.log("[Showroom] Rendering showroom data at", new Date().toISOString());
    console.log(`[Showroom] Fetching showroom data (v=${version})...`);
    console.log('[Showroom] Calling redisService.getShowroomData(false)');
    // Try to get fresh data from Redis with version parameter
    const data = await redisService.getShowroomData(false);
    
    console.log('[Showroom] Received showroom data:', {
      vehicleCount: data.vehicles?.length || 0,
      fromCache: data.fromCache,
      cachedAt: data.cachedAt,
      lastUpdated: data.lastUpdated,
      firstVehicle: data.vehicles?.[0]?.make || 'No vehicles'
    });

    console.log("[Showroom Debug] Raw Redis response keys:", Object.keys(data));
    console.log(
      "[Showroom Debug] Data source:",
      data.fromCache ? 'CACHED' : 'FRESH',
      data.lastUpdated ? `(Updated: ${new Date(data.lastUpdated).toISOString()})` : ''
    );

    // If we have an error in the response, treat it as a failure
    if (data.error) {
      console.log("[Showroom Debug] Error in Redis response:", data.error);
      throw new Error(data.error);
    }

    console.log("[Showroom Debug] Vehicles count:", data.vehicles?.length || 0);
    
    // Log first few vehicles for debugging
    const sampleVehicles = data.vehicles?.slice(0, 3) || [];
    console.log("[Showroom Debug] Sample vehicles:", 
      sampleVehicles.map(v => ({
        id: v.id,
        stockNumber: v.stockNumber,
        make: v.make,
        model: v.model,
        year: v.year,
        price: v.price
      }))
    );

    return {
      vehicles: data.vehicles || [],
      customMedia: data.customMedia || [],
      fromCache: data.fromCache || false,
    };
  } catch (error) {
    console.error('**********************************************');
    console.error('*** FAILED TO FETCH VEHICLES FROM REDIS ***');
    console.error('**********************************************');
    console.error('Error details:', error);
    console.error('This is likely due to a server startup or file permission issue. Please check the server logs.');
    return {
      vehicles: [],
      customMedia: [],
      fromCache: false,
      error:
        error instanceof Error ? error.message : "Failed to load showroom data",
    };
  }
}



export default async function ShowroomPage() {
  // Get fresh data on each request
  const { vehicles = [], fromCache } = await getShowroomData();



  if (!vehicles || vehicles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-900 text-white">
        <h1 className="text-3xl font-bold text-red-500">Failed to Load Vehicle Data</h1>
        <p className="mt-4 text-lg">Could not connect to the vehicle inventory database.</p>
        <p className="mt-2 text-md text-gray-400">Please ensure the backend server is running and accessible.</p>
        <p className="mt-1 text-sm text-gray-500">Check the server console for detailed error logs.</p>
      </div>
    );
  }

  return (
    <>
      {fromCache && (
        <div className="bg-yellow-900 text-yellow-100 text-center py-1 text-sm">
          Showing cached data - updates may be delayed
        </div>
      )}

      <InventoryCarousel vehicles={vehicles} />
      {/* Navigation Links */}
      <div className="fixed bottom-10 left-10 z-50 space-y-3">
        <button
          onClick={() => window.open('/content-creation', '_blank')}
          className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-6 py-3 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 flex items-center space-x-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
          </svg>
          <span>Content Studio</span>
        </button>
      </div>
    </>
  );
}
