import { redisService } from "@/lib/services/redisService";

export default async function TestVehicles() {
  try {
    const data = await redisService.getShowroomData();

    return (
      <div className="p-8 bg-gray-900 text-white min-h-screen">
        <h1 className="text-2xl font-bold mb-4">Vehicle Data Test</h1>
        <div className="space-y-4">
          <div>
            <strong>Vehicles Count:</strong> {data.vehicles?.length || 0}
          </div>
          <div>
            <strong>Custom Media Count:</strong> {data.customMedia?.length || 0}
          </div>
          <div>
            <strong>From Cache:</strong> {data.fromCache ? "Yes" : "No"}
          </div>
          <div>
            <strong>Error:</strong> {data.error || "None"}
          </div>
          {data.vehicles && data.vehicles.length > 0 && (
            <div>
              <strong>First Vehicle:</strong>
              <pre className="bg-gray-800 p-4 rounded mt-2 text-sm overflow-auto">
                {JSON.stringify(data.vehicles[0], null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    );
  } catch (error) {
    return (
      <div className="p-8 bg-gray-900 text-white min-h-screen">
        <h1 className="text-2xl font-bold mb-4">Vehicle Data Test - Error</h1>
        <div className="text-red-400">
          Error: {error instanceof Error ? error.message : "Unknown error"}
        </div>
      </div>
    );
  }
}
