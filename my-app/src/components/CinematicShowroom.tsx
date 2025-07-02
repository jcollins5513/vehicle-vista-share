"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Eye,
  Star,
  Navigation,
  Zap,
  Award,
  TrendingUp,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import type { VehicleWithMedia, Media, SlideshowItem } from "@/types";

interface CinematicShowroomProps {
  vehicles: VehicleWithMedia[];
  customMedia: Media[];
}

const FloatingOrb = ({ delay = 0, size = "small" }) => {
  const sizeClass =
    size === "large"
      ? "w-32 h-32"
      : size === "medium"
        ? "w-16 h-16"
        : "w-8 h-8";
  const glowClass = size === "large" ? "shadow-2xl" : "shadow-lg";

  return (
    <div
      className={`absolute ${sizeClass} rounded-full bg-gradient-to-r from-purple-400/20 to-pink-400/20 backdrop-blur-sm ${glowClass} floating`}
      style={{
        animationDelay: `${delay}s`,
        left: `${Math.random() * 80 + 10}%`,
        top: `${Math.random() * 80 + 10}%`,
      }}
    />
  );
};

const VehicleCard3D = ({ vehicle, index, isActive, onClick }: any) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className={`relative group cursor-pointer transition-all duration-700 transform ${
        isActive ? "scale-110 z-20" : "scale-95 hover:scale-105"
      }`}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ animationDelay: `${index * 0.1}s` }}
    >
      {/* 3D Card Container */}
      <div
        className={`relative w-full h-64 perspective-1000 ${isActive ? "bounce-in" : ""}`}
      >
        <div
          className={`relative w-full h-full transition-transform duration-700 transform-style-preserve-3d ${
            isHovered ? "rotate-y-12 rotate-x-6" : ""
          }`}
        >
          {/* Front Face */}
          <Card className="absolute inset-0 glass-card-dark rounded-2xl p-6 backface-hidden overflow-hidden">
            {/* Holographic Overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/10 via-transparent to-purple-400/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            {/* Vehicle Image */}
            <div className="relative h-32 mb-4 rounded-xl overflow-hidden">
              {vehicle.images && vehicle.images[0] && (
                <img
                  src={vehicle.images[0]}
                  alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
                  className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />

              {/* Floating Price Tag */}
              <div className="absolute top-2 right-2 glass-card px-3 py-1 rounded-full">
                <span className="text-emerald-400 font-bold text-sm">
                  ${vehicle.price?.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Vehicle Info */}
            <div className="space-y-2">
              <h3 className="text-white font-bold text-lg bg-gradient-to-r from-white to-cyan-200 bg-clip-text text-transparent">
                {vehicle.year} {vehicle.make}
              </h3>
              <p className="text-purple-200 font-semibold">{vehicle.model}</p>
              <div className="flex items-center space-x-4 text-sm text-white/70">
                <span>{vehicle.mileage?.toLocaleString()} mi</span>
                <span>•</span>
                <span className="text-cyan-300">{vehicle.color}</span>
              </div>
            </div>

            {/* Holographic Scan Lines */}
            <div className="absolute inset-0 pointer-events-none">
              <div
                className="w-full h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-0 group-hover:opacity-100 group-hover:animate-ping"
                style={{ top: "30%" }}
              />
              <div
                className="w-full h-0.5 bg-gradient-to-r from-transparent via-purple-400 to-transparent opacity-0 group-hover:opacity-100 group-hover:animate-ping"
                style={{ top: "70%", animationDelay: "0.5s" }}
              />
            </div>
          </Card>
        </div>
      </div>

      {/* Interactive Glow Ring */}
      <div
        className={`absolute inset-0 rounded-2xl transition-all duration-500 ${
          isActive
            ? "ring-4 ring-cyan-400/50 ring-offset-4 ring-offset-transparent"
            : ""
        }`}
      />
    </div>
  );
};

const StatsDisplay = () => {
  const [stats, setStats] = useState({
    totalViews: 1247,
    activeCustomers: 23,
    salesThisMonth: 47,
    satisfaction: 98,
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setStats((prev) => ({
        totalViews: prev.totalViews + Math.floor(Math.random() * 3),
        activeCustomers: Math.max(
          10,
          prev.activeCustomers + Math.floor(Math.random() * 3) - 1,
        ),
        salesThisMonth: prev.salesThisMonth,
        satisfaction: Math.min(
          100,
          Math.max(95, prev.satisfaction + (Math.random() - 0.5)),
        ),
      }));
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="grid grid-cols-2 gap-4">
      <Card className="glass-card-dark p-4 rounded-xl hover-glow">
        <div className="flex items-center space-x-3">
          <Eye className="w-6 h-6 text-cyan-400" />
          <div>
            <p className="text-cyan-400 text-2xl font-bold counter-animation">
              {stats.totalViews}
            </p>
            <p className="text-white/70 text-xs">Total Views</p>
          </div>
        </div>
      </Card>

      <Card className="glass-card-dark p-4 rounded-xl hover-glow">
        <div className="flex items-center space-x-3">
          <Navigation className="w-6 h-6 text-emerald-400" />
          <div>
            <p className="text-emerald-400 text-2xl font-bold">
              {stats.activeCustomers}
            </p>
            <p className="text-white/70 text-xs">Active Now</p>
          </div>
        </div>
      </Card>

      <Card className="glass-card-dark p-4 rounded-xl hover-glow">
        <div className="flex items-center space-x-3">
          <TrendingUp className="w-6 h-6 text-purple-400" />
          <div>
            <p className="text-purple-400 text-2xl font-bold">
              {stats.salesThisMonth}
            </p>
            <p className="text-white/70 text-xs">Sales/Month</p>
          </div>
        </div>
      </Card>

      <Card className="glass-card-dark p-4 rounded-xl hover-glow">
        <div className="flex items-center space-x-3">
          <Award className="w-6 h-6 text-yellow-400" />
          <div>
            <p className="text-yellow-400 text-2xl font-bold">
              {stats.satisfaction.toFixed(1)}%
            </p>
            <p className="text-white/70 text-xs">Satisfaction</p>
          </div>
        </div>
      </Card>
    </div>
  );
};

const CinematicShowroom = ({
  vehicles,
  customMedia,
}: CinematicShowroomProps) => {
  const [selectedVehicle, setSelectedVehicle] = useState(vehicles[0]);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isAutoPlaying || !vehicles.length) return;

    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % vehicles.length);
      setSelectedVehicle(vehicles[(currentSlide + 1) % vehicles.length]);
    }, 8000);

    return () => clearInterval(interval);
  }, [isAutoPlaying, vehicles, currentSlide]);

  const featuredVehicle = selectedVehicle || vehicles[0];

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 cosmic-gradient overflow-hidden"
    >
      {/* Ambient Floating Orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {Array.from({ length: 12 }).map((_, i) => (
          <FloatingOrb
            key={i}
            delay={i * 2}
            size={i % 3 === 0 ? "large" : i % 2 === 0 ? "medium" : "small"}
          />
        ))}
      </div>

      {/* Main Content */}
      <div className="relative z-10 h-full flex flex-col">
        {/* Cinematic Header */}
        <div className="flex justify-between items-center p-8">
          <div className="glass-card rounded-2xl p-6 hover-lift floating">
            <h1 className="text-4xl font-bold text-white text-glow bg-gradient-to-r from-white via-cyan-200 to-purple-200 bg-clip-text text-transparent">
              Bentley Supercenter
            </h1>
            <p className="text-cyan-200 text-lg mt-2">
              Immersive Automotive Experience
            </p>
          </div>

          {/* Control Panel */}
          <div className="flex space-x-4">
            <button
              onClick={() => setIsAutoPlaying(!isAutoPlaying)}
              className="cosmic-button-enhanced p-4 rounded-xl text-white hover:scale-110 transition-transform"
            >
              {isAutoPlaying ? <Pause size={24} /> : <Play size={24} />}
            </button>

            <button
              onClick={() => setIsMuted(!isMuted)}
              className="cosmic-button-enhanced p-4 rounded-xl text-white hover:scale-110 transition-transform"
            >
              {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
            </button>

            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="cosmic-button-enhanced p-4 rounded-xl text-white hover:scale-110 transition-transform"
            >
              <Maximize size={24} />
            </button>
          </div>
        </div>

        {/* Main Showcase */}
        <div className="flex-1 flex gap-8 p-8">
          {/* Featured Vehicle Display */}
          <div className="flex-1">
            <Card className="cosmic-slideshow rounded-3xl p-8 h-full hover-lift pulse-glow relative overflow-hidden">
              {/* Hero Vehicle Image */}
              <div className="relative h-96 mb-8 rounded-2xl overflow-hidden group">
                {featuredVehicle?.images && featuredVehicle.images[0] && (
                  <img
                    src={featuredVehicle.images[0]}
                    alt={`${featuredVehicle.year} ${featuredVehicle.make} ${featuredVehicle.model}`}
                    className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-1000"
                  />
                )}

                {/* Cinematic Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/20" />

                {/* Floating Vehicle Info */}
                <div className="absolute bottom-6 left-6 right-6">
                  <div className="glass-card-dark rounded-2xl p-6 backdrop-blur-xl">
                    <h2 className="text-4xl font-bold text-white mb-2 bg-gradient-to-r from-white to-cyan-200 bg-clip-text text-transparent">
                      {featuredVehicle?.year} {featuredVehicle?.make}{" "}
                      {featuredVehicle?.model}
                    </h2>
                    <div className="flex items-center space-x-6 text-lg">
                      <span className="text-emerald-400 font-bold text-2xl">
                        ${featuredVehicle?.price?.toLocaleString()}
                      </span>
                      <span className="text-white/70">•</span>
                      <span className="text-cyan-300">
                        {featuredVehicle?.mileage?.toLocaleString()} miles
                      </span>
                      <span className="text-white/70">•</span>
                      <span className="text-purple-300">
                        {featuredVehicle?.color}
                      </span>
                    </div>

                    {/* Interactive Features */}
                    <div className="flex space-x-4 mt-4">
                      <button className="cosmic-button-enhanced px-6 py-3 rounded-xl text-white font-medium">
                        Schedule Test Drive
                      </button>
                      <button className="glass-card-dark px-6 py-3 rounded-xl text-white border border-white/20 hover:border-cyan-400 transition-colors">
                        View 360°
                      </button>
                      <button className="glass-card-dark px-6 py-3 rounded-xl text-white border border-white/20 hover:border-purple-400 transition-colors">
                        Share
                      </button>
                    </div>
                  </div>
                </div>

                {/* Holographic Scan Effect */}
                <div className="absolute inset-0 pointer-events-none">
                  <div
                    className="w-full h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-50 animate-pulse"
                    style={{ top: "20%" }}
                  />
                  <div
                    className="w-full h-1 bg-gradient-to-r from-transparent via-purple-400 to-transparent opacity-50 animate-pulse"
                    style={{ top: "80%", animationDelay: "1s" }}
                  />
                </div>
              </div>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="w-96 space-y-6">
            {/* Live Stats */}
            <Card className="glass-card rounded-2xl p-6">
              <h3 className="text-white text-xl font-bold mb-4 flex items-center">
                <Zap className="w-6 h-6 mr-3 text-yellow-400" />
                Live Analytics
              </h3>
              <StatsDisplay />
            </Card>

            {/* Vehicle Gallery */}
            <Card className="glass-card rounded-2xl p-6">
              <h3 className="text-white text-xl font-bold mb-4">
                Vehicle Showcase
              </h3>
              <div className="space-y-4 max-h-96 overflow-y-auto custom-scrollbar">
                {vehicles.slice(0, 6).map((vehicle, index) => (
                  <VehicleCard3D
                    key={vehicle.id}
                    vehicle={vehicle}
                    index={index}
                    isActive={selectedVehicle?.id === vehicle.id}
                    onClick={() => setSelectedVehicle(vehicle)}
                  />
                ))}
              </div>
            </Card>

            {/* Customer Testimonials */}
            <Card className="glass-card rounded-2xl p-6">
              <h3 className="text-white text-xl font-bold mb-4 flex items-center">
                <Star className="w-6 h-6 mr-3 text-yellow-400" />
                Customer Reviews
              </h3>
              <div className="space-y-4">
                <div className="glass-card-dark p-4 rounded-xl">
                  <div className="flex items-center mb-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className="w-4 h-4 text-yellow-400 fill-current"
                      />
                    ))}
                  </div>
                  <p className="text-white/80 text-sm">
                    "Absolutely amazing experience! The team was professional
                    and the car exceeded my expectations."
                  </p>
                  <p className="text-cyan-300 text-xs mt-2">- Sarah M.</p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Ambient Audio Visualizer */}
      {!isMuted && (
        <div className="absolute bottom-4 left-4 flex space-x-1">
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className="w-1 bg-gradient-to-t from-cyan-400 to-purple-400 rounded-full animate-pulse"
              style={{
                height: `${Math.random() * 40 + 10}px`,
                animationDelay: `${i * 0.1}s`,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default CinematicShowroom;
