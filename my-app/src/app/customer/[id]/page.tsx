'use client';

import React, { useState, useEffect } from 'react';
import CustomerView from '@/components/CustomerView';
import { useParams } from 'next/navigation';
import type { Vehicle } from '@/types';

export default function CustomerPage() {
  const params = useParams();
  const vehicleId = params.id as string;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [vehicleData, setVehicleData] = useState<Vehicle | null>(null);
  const [allVehicles, setAllVehicles] = useState<Vehicle[]>([]);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        
        // Fetch the selected vehicle
        const vehicleResponse = await fetch(`/api/vehicle/${vehicleId}`);
        if (!vehicleResponse.ok) {
          throw new Error(`Failed to fetch vehicle: ${vehicleResponse.statusText}`);
        }
        const vehicleData = await vehicleResponse.json();
        setVehicleData(vehicleData);
        
        // Fetch all vehicles for the selector
        const allVehiclesResponse = await fetch('/api/vehicles');
        if (!allVehiclesResponse.ok) {
          throw new Error(`Failed to fetch vehicles: ${allVehiclesResponse.statusText}`);
        }
        const allVehiclesData = await allVehiclesResponse.json();
        setAllVehicles(allVehiclesData);
        
        setError(null);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load vehicle information. Please try again later.');
      } finally {
        setLoading(false);
      }
    }

    if (vehicleId) {
      fetchData();
    } else {
      setError('No vehicle ID provided');
      setLoading(false);
    }
  }, [vehicleId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 flex items-center justify-center">
        <div className="text-white text-2xl">Loading vehicle information...</div>
      </div>
    );
  }

  if (error || !vehicleData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-white text-3xl font-bold">Error</h1>
          <p className="text-white/80 mt-2">{error || 'Vehicle not found'}</p>
        </div>
      </div>
    );
  }

  // Combine vehicle images and manual media, filtering out stock photos
  const allImages = [
    ...(vehicleData.images || []).filter(url => {
      const lowerUrl = url.toLowerCase();
      return !lowerUrl.includes('rtt') && !lowerUrl.includes('chrome') && !lowerUrl.includes('default');
    }),
    ...((vehicleData as any).manualMedia || []).map((media: { url: string }) => media.url)
  ];

  // Create a complete vehicle object with the combined images
  const completeVehicle = {
    ...vehicleData,
    images: allImages,
    // Ensure status is one of the expected values
    status: vehicleData.status as 'available' | 'sold'
  };

  return <CustomerView id={vehicleId} vehicle={completeVehicle} allVehicles={allVehicles} />;
}
