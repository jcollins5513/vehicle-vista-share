"use client";

import React from "react";
import ExpandableCardGrid from "./ExpandableCardGrid";

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

export default function ShowroomGrid({ vehicles }: { vehicles: Vehicle[] }) {
  console.log("[ShowroomGrid] Rendering with vehicles:", vehicles.length);
  return <ExpandableCardGrid vehicles={vehicles} />;
}
