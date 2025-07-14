"use client";

import React, { useState, useEffect } from "react";
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import type { VehicleWithMedia as Vehicle } from "@/types";

interface ExpandableCardProps {
  vehicle: Vehicle;
  isActive: boolean;
  onActivate: () => void;

}

export default function ExpandableCard({ vehicle, isActive, onActivate }: ExpandableCardProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    if (!isActive || vehicle.images.length <= 1) return;

    const imageTimer = setInterval(() => {
      setCurrentImageIndex((prevIndex) => (prevIndex + 1) % Math.min(vehicle.images.length, 3));
    }, 3000); // Change image every 3 seconds

    return () => clearInterval(imageTimer);
  }, [isActive, vehicle.images.length]);

  useEffect(() => {
    setCurrentImageIndex(0);
  }, [vehicle]);
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
      <div className="relative w-full h-48 mb-4 overflow-hidden rounded-lg">
        <AnimatePresence initial={false}>
          <motion.div
            key={currentImageIndex}
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ duration: 0.5 }}
            className="absolute w-full h-full"
          >
            <Image
              src={vehicle.images[currentImageIndex]}
              alt={`${title} - image ${currentImageIndex + 1}`}
              layout="fill"
              objectFit="cover"
            />
          </motion.div>
        </AnimatePresence>
      </div>
      <h3 className="font-semibold mb-1">{title}</h3>
      <p className="text-gray-600">{description}</p>
      {isActive && (
        <div className="mt-4 space-y-2 text-sm text-gray-600">
          <div>
            <p><span className="font-semibold">Mileage:</span> {vehicle.mileage.toLocaleString()} miles</p>
            <p><span className="font-semibold">Color:</span> {vehicle.color}</p>
          </div>
          {(vehicle.description || (vehicle.features && vehicle.features.length > 0)) && (
            <div className="pt-2 mt-2 border-t border-gray-200">
              {vehicle.description ? (
                <p className="text-xs text-gray-500 line-clamp-3">{vehicle.description}</p>
              ) : (
                <ul className="text-xs text-gray-500 list-disc list-inside space-y-1">
                  {vehicle.features?.slice(0, 5).map((feature, index) => (
                    <li key={index} className="truncate">{feature}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}