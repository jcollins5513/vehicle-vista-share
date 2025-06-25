import { redisService } from '@/lib/services/redisService';
import ShowroomView from '@/components/ShowroomView';

// Revalidation time in seconds (5 minutes)
export const revalidate = 300;

async function getShowroomData() {
  try {
    // First try to get from Redis cache
    const cachedData = await redisService.getShowroomData();
    
    // If we have cached data and it's not too old, use it
    if (cachedData && (Date.now() - cachedData.cachedAt < 5 * 60 * 1000)) {
      return {
        vehicles: cachedData.vehicles,
        customMedia: cachedData.customMedia,
        fromCache: true,
      };
    }
    
    // If cache is stale or missing, try to refresh it
    const freshData = await redisService.getShowroomData(false);
    return {
      ...freshData,
      fromCache: false,
    };
  } catch (error) {
    console.error('Error in getShowroomData:', error);
    
    // Return empty data if there's an error
    return {
      vehicles: [],
      customMedia: [],
      fromCache: false,
      error: 'Failed to load showroom data',
    };
  }
}

export default async function ShowroomPage() {
  const { vehicles = [], customMedia = [], fromCache, error } = await getShowroomData();

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Temporary Unavailable</h1>
          <p className="mb-4">We're experiencing high traffic. Please try again in a few minutes.</p>
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
