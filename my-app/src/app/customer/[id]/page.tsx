import React from 'react';
import CustomerView from "../../../components/CustomerView";
import type { Vehicle, VehicleWithMedia } from "@/types";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  return {
    title: `Customer View - ${params.id}`,
  };
}

async function fetchVehicle(id: string): Promise<VehicleWithMedia | null> {
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

