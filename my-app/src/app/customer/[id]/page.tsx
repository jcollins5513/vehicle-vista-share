import React from 'react';
import { notFound } from 'next/navigation';
import type { Vehicle } from '@/types';
import CustomerView from '@/components/CustomerView';

interface CustomerPageParams {
  id?: string;
  vehicleId?: string;
  [key: string]: string | string[] | undefined;
}

// Helper to fetch data from API routes on the server
async function fetchVehicle(id: string): Promise<Vehicle | null> {
  const res = await fetch(`/api/vehicle/${id}`, { cache: 'no-store' });
  if (!res.ok) return null;
  return res.json();
}

async function fetchAllVehicles(): Promise<Vehicle[]> {
  const res = await fetch(`/api/vehicles`, { cache: 'no-store' });
  if (!res.ok) return [];
  return res.json();
}

export default async function CustomerPage({ params }: { params: { id: string } }) {
  // Debug log to help with troubleshooting
  console.log('[CustomerPage] params:', params);
  const vehicleId = params.id;
  if (!vehicleId) return notFound();

  // Fetch data in parallel
  const [vehicleData, allVehicles] = await Promise.all([
    fetchVehicle(vehicleId),
    fetchAllVehicles(),
  ]);

  if (!vehicleData) return notFound();

  // Combine images and manual media, filter out stock
  const allImages = [
    ...(vehicleData.images || []).filter((url: string) => {
      const lowerUrl = url.toLowerCase();
      return !lowerUrl.includes('rtt') && !lowerUrl.includes('chrome') && !lowerUrl.includes('default');
    }),
    ...((vehicleData as { manualMedia?: Array<{ url: string }> }).manualMedia || []).map((media) => media.url)
  ];

  const completeVehicle = {
    ...vehicleData,
    images: allImages,
    status: vehicleData.status as 'available' | 'sold',
  };

  return <CustomerView id={vehicleId} vehicle={completeVehicle} allVehicles={allVehicles} />;
}

