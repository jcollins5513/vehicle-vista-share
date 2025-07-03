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
  
      // Ensure response is an array
      if (!Array.isArray(data)) {
        return { vehicles: [], error: "Unexpected API response format." };
      }
  
      return {
        vehicles: data,
        error: null,
      };
    } catch (err: any) {
      return {
        vehicles: [],
        error: err.message || "Unknown error occurred.",
      };
    }
  }
  