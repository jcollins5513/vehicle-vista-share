"use client";

import React from "react";
import ExpandableCardGrid from "./ExpandableCardGrid";
import type { VehicleWithMedia as Vehicle } from "@/types";

export default function ShowroomGrid({ vehicles }: { vehicles: Vehicle[] }) {
  console.log("[ShowroomGrid] Rendering with vehicles:", vehicles.length);
  return <ExpandableCardGrid vehicles={vehicles} />;
}
