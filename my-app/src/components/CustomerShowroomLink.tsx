"use client";

import { useRouter } from "next/navigation";
import { InteractiveHoverButton } from "@/components/magicui/interactive-hover-button";

export default function CustomerShowroomLink() {
  const router = useRouter();

  return (
    <div className="fixed bottom-10 right-10 z-50">
      <InteractiveHoverButton onClick={() => router.push("/customershowroom")}>
        Customer Showroom
      </InteractiveHoverButton>
    </div>
  );
}
