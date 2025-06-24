'use client';

import React, { useState, useEffect } from 'react';
import CustomerView from '@/components/CustomerView';
import { useSearchParams } from 'next/navigation';
import type { Vehicle } from '@/types';

export default function CustomerPage() {
  const searchParams = useSearchParams();
  const vehicleIds = searchParams.get('ids')?.split(',') || [];
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVehicleData, setSelectedVehicleData] = useState<Vehicle | null>(null);
  const [allVehicles, setAllVehicles] = useState<Vehicle[]>([]);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        
        // If no vehicle IDs provided, show error
        if (vehicleIds.length === 0) {
          setError('No vehicles selected for sharing');
          setLoading(false);
          return;
        }
        
        // Fetch all vehicles for the selector
        const allVehiclesResponse = await fetch('/api/vehicles');
        if (!allVehiclesResponse.ok) {
          throw new Error(`Failed to fetch vehicles: ${allVehiclesResponse.statusText}`);
        }
        const allVehiclesData = await allVehiclesResponse.json();
        
        // Filter to only include the shared vehicles
        const sharedVehicles = allVehiclesData.filter((v: Vehicle) => 
          vehicleIds.includes(v.id)
        );
        
        if (sharedVehicles.length === 0) {
          setError('No matching vehicles found');
          setLoading(false);
          return;
        }
        
        // Set the first shared vehicle as the selected one
        setSelectedVehicleData(sharedVehicles[0]);
        
        // Set all vehicles for browsing
        setAllVehicles(allVehiclesData);
        
        setError(null);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load vehicle information. Please try again later.');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [vehicleIds]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 flex items-center justify-center">
        <div className="text-white text-2xl">Loading vehicle information...</div>
      </div>
    );
  }

  if (error || !selectedVehicleData) {
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
    ...(selectedVehicleData.images || []).filter(url => {
      const lowerUrl = url.toLowerCase();
      return !lowerUrl.includes('rtt') && !lowerUrl.includes('chrome') && !lowerUrl.includes('default');
    }),
    ...((selectedVehicleData as any).manualMedia || []).map((media: { url: string }) => media.url)
  ];

  // Create a complete vehicle object with the combined images
  const completeVehicle = {
    ...selectedVehicleData,
    images: allImages
  };

  return <CustomerView id={selectedVehicleData.id} vehicle={completeVehicle} allVehicles={allVehicles} />;
}
