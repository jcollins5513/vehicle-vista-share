// my-app/src/app/actions/index.ts

export async function getShowroomDataAction() {
    try {
      const res = await fetch("/api/vehicles", {
        method: "GET",
        cache: "no-store", // prevents stale data
      });
  
      if (!res.ok) {
        return { vehicles: [], error: "Failed to fetch inventory." };
      }
  
      const data = await res.json();
  
      // Handle the new API response format
      if (data.success && Array.isArray(data.vehicles)) {
        return {
          vehicles: data.vehicles,
          error: null,
        };
      } else if (data.error) {
        return { vehicles: [], error: data.error };
      } else if (Array.isArray(data)) {
        // Fallback for old format (if any endpoints still use it)
        return {
          vehicles: data,
          error: null,
        };
      } else {
        return { vehicles: [], error: "Unexpected API response format." };
      }
    } catch (err: any) {
      return {
        vehicles: [],
        error: err.message || "Unknown error occurred.",
      };
    }
  }
  