/* eslint-disable @next/next/no-img-element */
"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Play, XIcon, ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";

import { cn } from "@/lib/utils";

type AnimationStyle =
  | "from-bottom"
  | "from-center"
  | "from-top"
  | "from-left"
  | "from-right"
  | "fade"
  | "top-in-bottom-out"
  | "left-in-right-out";

interface HeroImageDialogProps {
  animationStyle?: AnimationStyle;
  images: string[];
  thumbnailSrc: string;
  thumbnailAlt?: string;
  className?: string;
  vehicleTitle?: string;
}

const animationVariants = {
  "from-bottom": {
    initial: { y: "100%", opacity: 0 },
    animate: { y: 0, opacity: 1 },
    exit: { y: "100%", opacity: 0 },
  },
  "from-center": {
    initial: { scale: 0.5, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    exit: { scale: 0.5, opacity: 0 },
  },
  "from-top": {
    initial: { y: "-100%", opacity: 0 },
    animate: { y: 0, opacity: 1 },
    exit: { y: "-100%", opacity: 0 },
  },
  "from-left": {
    initial: { x: "-100%", opacity: 0 },
    animate: { x: 0, opacity: 1 },
    exit: { x: "-100%", opacity: 0 },
  },
  "from-right": {
    initial: { x: "100%", opacity: 0 },
    animate: { x: 0, opacity: 1 },
    exit: { x: "100%", opacity: 0 },
  },
  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },
  "top-in-bottom-out": {
    initial: { y: "-100%", opacity: 0 },
    animate: { y: 0, opacity: 1 },
    exit: { y: "100%", opacity: 0 },
  },
  "left-in-right-out": {
    initial: { x: "-100%", opacity: 0 },
    animate: { x: 0, opacity: 1 },
    exit: { x: "100%", opacity: 0 },
  },
};

export function HeroImageDialog({
  animationStyle = "from-center",
  images,
  thumbnailSrc,
  thumbnailAlt = "Vehicle image",
  className,
  vehicleTitle,
}: HeroImageDialogProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const selectedAnimation = animationVariants[animationStyle];

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") nextImage();
    if (e.key === "ArrowLeft") prevImage();
    if (e.key === "Escape") setIsDialogOpen(false);
  };

  return (
    <div className={cn("relative", className)}>
      <div
        className="group relative cursor-pointer"
        onClick={() => setIsDialogOpen(true)}
      >
        <img
          src={thumbnailSrc}
          alt={thumbnailAlt}
          width={1920}
          height={1080}
          className="w-full rounded-md border shadow-lg transition-all duration-200 ease-out group-hover:brightness-[0.8]"
        />
        <div className="absolute inset-0 flex scale-[0.9] items-center justify-center rounded-2xl transition-all duration-200 ease-out group-hover:scale-100">
          <div className="flex size-28 items-center justify-center rounded-full bg-primary/10 backdrop-blur-md">
            <div className="relative flex size-20 scale-100 items-center justify-center rounded-full bg-gradient-to-b from-primary/30 to-primary shadow-md transition-all duration-200 ease-out group-hover:scale-[1.2]">
              <Play
                className="size-8 scale-100 fill-white text-white transition-transform duration-200 ease-out group-hover:scale-105"
                style={{
                  filter:
                    "drop-shadow(0 4px 3px rgb(0 0 0 / 0.07)) drop-shadow(0 2px 2px rgb(0 0 0 / 0.06))",
                }}
              />
            </div>
          </div>
        </div>
      </div>
      <AnimatePresence>
        {isDialogOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-md"
            onKeyDown={handleKeyDown}
            tabIndex={0}
          >
            <motion.div
              {...selectedAnimation}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="relative mx-4 w-full max-w-5xl md:mx-0"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header with title and close button */}
              <div className="flex items-center justify-between mb-4">
                {vehicleTitle && (
                  <h2 className="text-white text-xl font-bold">
                    {vehicleTitle}
                  </h2>
                )}
                <motion.button
                  onClick={() => setIsDialogOpen(false)}
                  className="rounded-full bg-neutral-900/50 p-2 text-xl text-white ring-1 backdrop-blur-md hover:bg-neutral-900/70 transition-colors dark:bg-neutral-100/50 dark:text-black"
                >
                  <XIcon className="size-5" />
                </motion.button>
              </div>

              {/* Main image container */}
              <div className="relative isolate z-[1] w-full aspect-video overflow-hidden rounded-2xl border-2 border-white">
                <Image
                  src={images[currentImageIndex] || thumbnailSrc}
                  alt={`${vehicleTitle || "Vehicle"} - Image ${currentImageIndex + 1}`}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 80vw"
                />

                {/* Navigation arrows */}
                {images.length > 1 && (
                  <>
                    <button
                      onClick={prevImage}
                      className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white hover:bg-black/70 transition-colors"
                    >
                      <ChevronLeft className="size-6" />
                    </button>
                    <button
                      onClick={nextImage}
                      className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white hover:bg-black/70 transition-colors"
                    >
                      <ChevronRight className="size-6" />
                    </button>
                  </>
                )}

                {/* Image counter */}
                {images.length > 1 && (
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 px-3 py-1 rounded-full text-white text-sm">
                    {currentImageIndex + 1} / {images.length}
                  </div>
                )}
              </div>

              {/* Thumbnail navigation */}
              {images.length > 1 && (
                <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
                  {images.map((image, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentImageIndex(index)}
                      className={cn(
                        "flex-shrink-0 w-20 h-14 rounded-md overflow-hidden border-2 transition-colors",
                        currentImageIndex === index
                          ? "border-blue-500"
                          : "border-white/30 hover:border-white/60",
                      )}
                    >
                      <img
                        src={image}
                        alt={`Thumbnail ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </motion.div>

            {/* Click outside to close */}
            <div
              className="absolute inset-0 -z-10"
              onClick={() => setIsDialogOpen(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default HeroImageDialog;
