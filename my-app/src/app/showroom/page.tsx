import { redisService } from "@/lib/services/redisService";
import { unstable_cache } from "next/cache";
import ShowroomView from "@/components/ShowroomView";

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
    console.error("[Showroom Debug] Error in getShowroomData:", error);

    // Return empty data if there's an error
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
    customMedia = [],
    fromCache,
    error,
  } = await getCachedShowroomData();

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Temporary Unavailable</h1>
          <p className="mb-4">
            We&apos;re experiencing high traffic. Please try again in a few
            minutes.
          </p>
          {fromCache && (
            <p className="text-sm text-gray-400">Showing cached data</p>
          )}
        </div>
      </div>
    );
  }

  if (vehicles.length === 0 && customMedia.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">No Vehicles Available</h1>
          <p>Please check back later for updates.</p>
          {fromCache && (
            <p className="text-sm text-gray-400 mt-2">Showing cached data</p>
          )}
        </div>
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
      <ShowroomView vehicles={vehicles} customMedia={customMedia} />
    </>
  );
}