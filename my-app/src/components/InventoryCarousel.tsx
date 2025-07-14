"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { VehicleWithMedia } from '@/types';
import ExpandableCard from './ExpandableCard';

interface InventoryCarouselProps {
  vehicles: VehicleWithMedia[];
}

export default function InventoryCarousel({ vehicles }: InventoryCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [position, setPosition] = useState({ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' });

  useEffect(() => {
    if (vehicles.length === 0) return;

    const timer = setInterval(() => {
      const top = `${Math.random() * 50 + 25}%`; // 25% to 75% of screen height
      const left = `${Math.random() * 50 + 25}%`; // 25% to 75% of screen width
      setPosition({ top, left, transform: 'translate(-50%, -50%)' });
      setCurrentIndex((prevIndex) => (prevIndex + 1) % vehicles.length);
    }, 9000); // Change vehicle every 9 seconds

    return () => clearInterval(timer);
  }, [vehicles.length]);

  if (vehicles.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
        <h2 className="text-2xl">No vehicles in inventory.</h2>
      </div>
    );
  }

  return (
    <div
      className="relative w-full h-screen flex flex-col items-center justify-center overflow-hidden p-4"
      style={{
        backgroundImage: `url(/showroom-background.png)`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <AnimatePresence initial={false}>
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1, ...position }}
          exit={{ opacity: 0, scale: 0.5 }}
          transition={{ type: 'spring', stiffness: 120, damping: 20 }}
          className="absolute w-full max-w-md"
          style={position}
        >
          <ExpandableCard
            vehicle={vehicles[currentIndex]}
            isActive={true}
            onActivate={() => {}} // No action needed on click in this context
          />
        </motion.div>
      </AnimatePresence>

      {/* Dots for navigation */}
      <div className="absolute bottom-10 flex space-x-2">
        {vehicles.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className={`w-3 h-3 rounded-full transition-colors duration-300 ${
              currentIndex === index ? 'bg-blue-500' : 'bg-gray-500'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
