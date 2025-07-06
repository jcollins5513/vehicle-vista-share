"use client";

import React from "react";
import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

type Vehicle = {
  id: string;
  year: number;
  make: string;
  model: string;
  price: number;
  mileage: number;
  color: string;
  images: string[];
};

interface VehicleCardProps {
  vehicle: Vehicle;
  onClick: (vehicle: Vehicle) => void;
}

export default function VehicleCard({ vehicle, onClick }: VehicleCardProps) {
  const title = `${vehicle.year} ${vehicle.make} ${vehicle.model}`;
  const description = `$${vehicle.price.toLocaleString()}`;

  return (
    <Card
      onClick={() => {
        console.log("[VehicleCard] Clicked:", vehicle.id);
        onClick(vehicle);
      }}
      className="cursor-pointer hover:shadow-md transition-shadow"
    >
      <CardHeader className="p-0">
        <img
          src={vehicle.images[0]}
          alt={title}
          className="w-full h-48 object-cover rounded-t-lg"
        />
      </CardHeader>
      <CardContent className="p-4">
        <CardTitle className="text-lg mb-1">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardContent>
    </Card>
  );
}
