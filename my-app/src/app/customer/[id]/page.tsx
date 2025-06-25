'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';
import type { Vehicle } from '@/types';

type FetchError = Error & { name: string };

interface CustomerPageParams {
  id?: string;
  vehicleId?: string;
  [key: string]: string | string[] | undefined;
}

export default function CustomerPage() {
  const params = useParams<CustomerPageParams>();
  const isMounted = useRef(true);
  const abortController = useRef<AbortController | null>(null);
  
  // Support both [id] and [vehicleId] for backward compatibility
  const vehicleId = (params.id || params.vehicleId) as string;
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [vehicleData, setVehicleData] = useState<Vehicle | null>(null);
  const [allVehicles, setAllVehicles] = useState<Vehicle[]>([]);

  const fetchData = useCallback(async () => {
    if (!vehicleId || !isMounted.current) return;
    
    // Cancel any pending requests
    if (abortController.current) {
      abortController.current.abort();
    }
    
    abortController.current = new AbortController();
    const signal = abortController.current.signal;
    
    try {
      setLoading(true);
      setError(null);
      
      // Fetch the selected vehicle
      const vehicleResponse = await fetch(`/api/vehicle/${vehicleId}`, { signal });
      if (!vehicleResponse.ok) {
        throw new Error(`Failed to fetch vehicle: ${vehicleResponse.statusText}`);
      }
      
      const vehicleData = await vehicleResponse.json();
      
      // Only update state if component is still mounted
      if (isMounted.current) {
        setVehicleData(vehicleData);
        
        // Only fetch all vehicles if we don't have them yet and shouldFetchAllVehicles is true
        if (shouldFetchAllVehicles && allVehicles.length === 0) {
          const allVehiclesResponse = await fetch('/api/vehicles', { signal });
          if (!allVehiclesResponse.ok) {
            console.warn('Failed to fetch all vehicles, using empty array');
            return;
          }
          const allVehiclesData = await allVehiclesResponse.json();
          setAllVehicles(allVehiclesData);
        }
      }
    } catch (err) {
      const error = err as FetchError;
      if (error.name !== 'AbortError') {
        console.error('Error fetching data:', error);
        if (isMounted.current) {
          setError('Failed to load vehicle information. Please try again later.');
        }
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, [vehicleId, allVehicles.length]); // Added allVehicles.length back to fix missing dependency

  // Initial data load
  useEffect(() => {
    isMounted.current = true;
    
    // Clean up any existing controller
    if (abortController.current) {
      abortController.current.abort();
    }
    
    if (!vehicleId) {
      setError('No vehicle ID provided');
      setLoading(false);
      return;
    }
    
    // Initial data fetch
    const timer = setTimeout(() => {
      if (isMounted.current) {
        fetchData(true); // Fetch both vehicle and all vehicles
      }
    }, 300);
    
    return () => {
      clearTimeout(timer);
      isMounted.current = false;
      if (abortController.current) {
        abortController.current.abort();
      }
    };
  }, [vehicleId, fetchData]); // Added fetchData to dependencies

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
    ...(vehicleData.images || []).filter((url: string) => {
      const lowerUrl = url.toLowerCase();
      return !lowerUrl.includes('rtt') && !lowerUrl.includes('chrome') && !lowerUrl.includes('default');
    }),
    ...((vehicleData as { manualMedia?: Array<{ url: string }> }).manualMedia || []).map((media) => media.url)
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
