'use client';

import { useState, useEffect } from 'react';
import AIFloatingChatbot from '@/components/AIFloatingChatbot';
import AppointmentCalendar from '@/components/AppointmentCalendar';
import VehicleSelector from '@/components/VehicleSelector';
import ShowroomTools from '@/components/ShowroomTools';
import MediaUploader from '@/components/MediaUploader';
import QRCodeGenerator from '@/components/QRCodeGenerator';
import { getShowroomDataAction } from '@/app/actions';
import type { VehicleWithMedia } from '@/types';

export default function ToolsPage() {
  const [vehicles, setVehicles] = useState<VehicleWithMedia[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleWithMedia | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const { vehicles: fetched, error } = await getShowroomDataAction();
      if (error) {
        console.error('❌ Failed to load vehicles:', error);
      } else {
        setVehicles(fetched);
        if (fetched.length > 0) {
          setSelectedVehicle(fetched[0]);
        }
      }
    };
    fetchData();
  }, []);

  const handleGenerateLink = (ids: string[]) => {
    if (ids.length === 0) return;
    const url = `${window.location.origin}/customer/${ids[0]}`;
    navigator.clipboard.writeText(url);
    alert(`Customer link copied: ${url}`);
  };

  if (!selectedVehicle) {
    return <div className="p-4">Loading...</div>;
  }

  return (
    <div className="p-4 space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-6">
          <VehicleSelector
            currentVehicle={selectedVehicle}
            onVehicleSelect={setSelectedVehicle}
            vehicles={vehicles}
          />
          <MediaUploader vehicleId={selectedVehicle.id} />
          <AppointmentCalendar />
        </div>
        <div className="space-y-6 lg:col-span-2">
          <ShowroomTools
            selectedVehicle={selectedVehicle}
            onVehicleSelect={setSelectedVehicle}
            onGenerateLink={handleGenerateLink}
            vehicles={vehicles}
          />
          <QRCodeGenerator vehicles={vehicles} />
        </div>
      </div>
      <AIFloatingChatbot selectedVehicle={selectedVehicle} />
    </div>
  );
}
