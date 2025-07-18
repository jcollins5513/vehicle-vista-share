import { redisService } from "@/lib/services/redisService";
import { unstable_cache } from "next/cache";

import InventoryCarousel from "@/components/InventoryCarousel";
import CustomerShowroomLink from "@/components/CustomerShowroomLink";

// Revalidation time in seconds (5 minutes)
export const revalidate = 300;

async function getShowroomData() {
  try {
    console.log("[Showroom Debug] Fetching showroom data...");
    // Try to get fresh data from Redis
    const data = await redisService.getShowroomData();

    console.log(
      "[Showroom Debug] Raw Redis response:",
      JSON.stringify(data, null, 2),
    );

    // If we have an error in the response, treat it as a failure
    if (data.error) {
      console.log("[Showroom Debug] Error in Redis response:", data.error);
      throw new Error(data.error);
    }

    console.log("[Showroom Debug] Vehicles count:", data.vehicles?.length || 0);
    console.log(
      "[Showroom Debug] First vehicle:",
      data.vehicles?.[0] ? JSON.stringify(data.vehicles[0]) : "None",
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
  const getCachedShowroomData = unstable_cache(
    async () => getShowroomData(),
    ["showroom-data"],
    { revalidate: revalidate },
  );
  const {
    vehicles = [],
    fromCache,
  } = await getCachedShowroomData();



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
      <CustomerShowroomLink />
    </>
  );
}
