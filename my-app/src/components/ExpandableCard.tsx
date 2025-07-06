

"use client";

import React from "react";
import Modal from "./Modal";

type Vehicle = {
  id: string
  year: number
  make: string
  model: string
  price: number
  mileage: number
  color: string
  images: string[]
}

interface ExpandableCardProps {
  vehicle: Vehicle;
  isActive: boolean;
  onActivate: () => void;
  onClose: () => void;
}

export default function ExpandableCard({ vehicle, isActive, onActivate, onClose }: ExpandableCardProps) {
  const title = `${vehicle.year} ${vehicle.make} ${vehicle.model}`;
  const description = `$${vehicle.price.toLocaleString()}`;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => {
        console.log('[ExpandableCard] Card clicked for vehicle:', vehicle.id);
        onActivate();
      }}
      className={`
        bg-white p-4 rounded-lg shadow cursor-pointer
        transition-all duration-200
        ${isActive ? 'ring-2 ring-blue-500 shadow-lg scale-105' : 'hover:shadow-md'}
      `}
    >
      <img
        src={vehicle.images[0]}
        alt={title}
        className="w-full h-48 object-cover rounded-lg mb-4"
      />
      <h3 className="font-semibold mb-1">{title}</h3>
      <p className="text-gray-600">{description}</p>
      {isActive && (
        <div className="mt-4 space-y-2 text-sm text-gray-500">
          <p>Mileage: {vehicle.mileage.toLocaleString()} miles</p>
          <p>Color: {vehicle.color}</p>
        </div>
      )}
    </div>
  );
}