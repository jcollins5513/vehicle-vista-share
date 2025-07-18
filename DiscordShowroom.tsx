"use client";

import React, { useState, useEffect } from "react";
import {
  Play,
  Pause,
  Volume2,
  Star,
  Users,
  Settings,
  Search,
  MessageSquare,
  Trophy,
  Calendar,
  Eye,
  ArrowRight,
  Car,
  Zap,
  Award,
  Navigation,
  Clock,
  Filter,
  Grid3X3,
  List,
  Share2,
  Instagram,
  Facebook,
  Twitter,
  Camera,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import AIFloatingChatbot from "@/components/AIFloatingChatbot";
import Link from "next/link";
import type { VehicleWithMedia, Media } from "@/types";
import { motion, AnimatePresence } from "framer-motion";


interface DiscordShowroomProps {
  vehicles: VehicleWithMedia[];
  customMedia: Media[];
}

// Discord-style Sidebar Navigation
const DiscordSidebar = () => {
  const [activeSection, setActiveSection] = useState("showroom");

  const sections = [
    { id: "showroom", name: "Showroom", icon: Car, active: true },
    { id: "inventory", name: "Customer Showroom ", icon: Grid3X3 },
    { id: "featured", name: "Featured", icon: Star },
    { id: "new-arrivals", name: "Manager Special", icon: Zap },
    { id: "appointments", name: "Social Media Portal", icon: Calendar },
  ];

  return (
    <div className="w-60 bg-[#2f3136] h-full flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 pb-9 border-b border-black/20">
        <img
          src="https://cdn.builder.io/api/v1/image/assets%2F0f7830926b04438e96198e445d7c6df8%2Fd945695f3c88472c9e8bfb7dd5aa59a5"
          alt="Logo"
          className="w-full mt-5 aspect-[2.7] object-cover object-center min-h-5 min-w-5 overflow-hidden"
        />
      </div>

      {/* Navigation */}
      <div className="flex-1 px-2 py-4">
        <div className="space-y-1">
          {sections.map((section) => {
            if (section.id === "appointments") {
              return (
                <Link
                  key={section.id}
                  href="/social-portal"
                  className={`w-full flex items-center px-3 py-2 rounded-md text-left transition-colors ${
                    activeSection === section.id
                      ? "bg-[#5865f2] text-white"
                      : "text-gray-300 hover:bg-[#404449] hover:text-white"
                  }`}
                >
                  <section.icon className="w-5 h-5 mr-3" />
                  <span className="text-sm font-medium">{section.name}</span>
                </Link>
              );
            } else {
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full flex items-center px-3 py-2 rounded-md text-left transition-colors ${
                    activeSection === section.id
                      ? "bg-[#5865f2] text-white"
                      : "text-gray-300 hover:bg-[#404449] hover:text-white"
                  }`}
                >
                  <section.icon className="w-5 h-5 mr-3" />
                  <span className="text-sm font-medium">{section.name}</span>
                  {section.id === "new-arrivals" && (
                    <div className="ml-auto w-2 h-2 bg-[#ed4245] rounded-full" />
                  )}
                </button>
              );
            }
          })}
        </div>
      </div>
    </div>
  );
};

// Discord-style Vehicle Quest Card
// Discord-style Vehicle Quest Card
const VehicleQuestCard = ({
  vehicle,
  index,
  onClick,
}: {
  vehicle: VehicleWithMedia;
  index: number;
  onClick: (vehicle: VehicleWithMedia) => void;
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [randomViews, setRandomViews] = useState(0);
  const [randomInterested, setRandomInterested] = useState(0);

  const badges = ["NEW", "FEATURED", "LIMITED"];
  const badge = badges[index % badges.length];

  useEffect(() => {
    setRandomViews(Math.floor(Math.random() * 500) + 100);
    setRandomInterested(Math.floor(Math.random() * 20) + 5);
  }, []);

  const shareVehicle = (platform: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const vehicleText = `Check out this ${vehicle.year} ${vehicle.make} ${vehicle.model} for $${vehicle.price?.toLocaleString()}! 🚗✨`;
    const url = `${window.location.origin}/customer/${vehicle.id}`;

    const shareUrls = {
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(vehicleText)}&url=${encodeURIComponent(url)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      instagram: "/social-portal", // Navigate to social portal for image processing
    };

    if (platform === "instagram") {
      window.open(shareUrls[platform], "_blank");
    } else {
      window.open(shareUrls[platform as keyof typeof shareUrls], "_blank");
    }
  };

  return (
    <motion.div
      layoutId={`card-container-${vehicle.id}`}
      className="bg-[#2f3136] border border-black/20 rounded-lg overflow-hidden transition-all duration-300 ease-in-out hover:shadow-lg hover:border-[#5865f2] transform hover:-translate-y-1 cursor-pointer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onClick(vehicle)}
    >
      {/* Vehicle Image */}
      <div className="relative aspect-video">
        {vehicle.images && vehicle.images[0] && (
          <img
            src={vehicle.images[0]}
            alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
            className="w-full h-full object-cover"
          />
        )}

        {/* Badge */}
        <div className="absolute top-3 left-3">
          <span className="bg-[#5865f2] text-white text-xs font-bold px-2 py-1 rounded">
            {badge}
          </span>
        </div>

        {/* Progress Indicator */}
        <div className="absolute top-3 right-3">
          <div className="bg-black/50 rounded-full px-2 py-1">
            <span className="text-white text-xs">Ends 4/14</span>
          </div>
        </div>

        {/* Hover Overlay */}
        {isHovered && (
          <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
            <div className="bg-black/70 rounded-full p-3">
              <Play className="w-6 h-6 text-white" />
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-2">
          <div>
            <div className="text-gray-400 text-xs uppercase tracking-wider">
              {vehicle.year} Model
            </div>
            <h3 className="text-white font-bold text-sm">
              {vehicle.make} {vehicle.model}
            </h3>
          </div>
          <div className="text-[#00d9ff] text-xs font-bold">
            ${vehicle.price?.toLocaleString()}
          </div>
        </div>

        {/* Description */}
        <p className="text-gray-300 text-sm mb-4 line-clamp-2">
          Experience luxury redefined with this pristine {vehicle.color}{" "}
          {vehicle.model}. Only {vehicle.mileage?.toLocaleString()} miles.
        </p>

        {/* Quest Action Button */}
        <button className="w-full bg-[#5865f2] hover:bg-[#4752c4] text-white font-medium py-3 px-4 rounded transition-colors flex items-center justify-center space-x-2 mb-3">
          <span>Start Virtual Tour</span>
          <ArrowRight className="w-4 h-4" />
        </button>

        {/* Social Media Sharing */}
        <div className="flex items-center justify-between">
          <span className="text-gray-400 text-xs font-medium">Share:</span>
          <div className="flex space-x-2">
            <button
              onClick={(e) => shareVehicle("twitter", e)}
              className="p-2 bg-[#40444b] hover:bg-[#1da1f2] rounded transition-colors group"
              title="Share on Twitter"
            >
              <Twitter className="w-3 h-3 text-gray-400 group-hover:text-white" />
            </button>
            <button
              onClick={(e) => shareVehicle("facebook", e)}
              className="p-2 bg-[#40444b] hover:bg-[#1877f2] rounded transition-colors group"
              title="Share on Facebook"
            >
              <Facebook className="w-3 h-3 text-gray-400 group-hover:text-white" />
            </button>
            <button
              onClick={(e) => shareVehicle("instagram", e)}
              className="p-2 bg-[#40444b] hover:bg-[#c13584] rounded transition-colors group"
              title="Share on Instagram"
            >
              <Instagram className="w-3 h-3 text-gray-400 group-hover:text-white" />
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-600">
          <div className="flex items-center space-x-1">
            <Eye className="w-4 h-4 text-gray-400" />
            <span className="text-gray-400 text-xs">{randomViews} views</span>
          </div>
          <div className="flex items-center space-x-1">
            <Star className="w-4 h-4 text-yellow-400" />
            <span className="text-gray-400 text-xs">4.9</span>
          </div>
          <div className="flex items-center space-x-1">
            <Users className="w-4 h-4 text-gray-400" />
            <span className="text-gray-400 text-xs">
              {randomInterested} interested
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// Discord-style Top Bar
const DiscordTopBar = () => {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="bg-[#36393f] border-b border-black/20 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Title */}
        <div className="flex items-center space-x-4">
          <h1 className="text-white text-xl font-bold">
            <div></div>
          </h1>
          <div className="text-gray-400 text-sm">
            Win premium test drives, discover exclusive deals, and more through
            our showroom!
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search vehicles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-[#202225] text-white pl-10 pr-4 py-2 rounded border-none outline-none focus:ring-2 focus:ring-[#5865f2] w-64"
          />
        </div>
      </div>

      {/* Quest Tabs */}
      <div className="flex items-center space-x-6 mt-4">
        <button className="text-white font-medium border-b-2 border-[#5865f2] pb-2">
          All Vehicles
        </button>
        <button className="text-gray-400 hover:text-white pb-2">
          Featured Collection
        </button>
        <div className="flex items-center space-x-2 ml-auto">
          <Filter className="w-4 h-4 text-gray-400" />
          <span className="text-gray-400 text-sm">Filter</span>
        </div>
      </div>
    </div>
  );
};

// Featured Vehicle Showcase
const FeaturedShowcase = ({ vehicle }: { vehicle: VehicleWithMedia }) => {
  return (
    <div className="bg-[#2f3136] rounded-lg p-6 mb-6">
      <div className="flex items-start space-x-6">
        {/* Large Image */}
        <div className="flex-1">
          <div className="relative aspect-video rounded-lg overflow-hidden">
            {vehicle.images && vehicle.images[0] && (
              <img
                src={vehicle.images[0]}
                alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
                className="w-full h-full object-cover"
              />
            )}

            {/* Featured Badge */}
            <div className="absolute top-4 left-4">
              <span className="bg-gradient-to-r from-[#ff6b6b] to-[#feca57] text-white text-sm font-bold px-3 py-1 rounded-full">
                FEATURED LUXURY
              </span>
            </div>

            {/* Action Overlay */}
            <div className="absolute bottom-4 left-4 right-4">
              <button className="w-full bg-[#5865f2] hover:bg-[#4752c4] text-white font-bold py-4 px-6 rounded-lg transition-colors flex items-center justify-center space-x-2 text-lg">
                <Play className="w-6 h-6" />
                <span>Start Premium Experience</span>
              </button>
            </div>
          </div>
        </div>

        {/* Vehicle Info */}
        <div className="w-80">
          <div className="bg-[#36393f] rounded-lg p-4">
            <div className="mb-4">
              <div className="text-[#00d9ff] text-sm font-medium mb-1">
                PREMIUM SHOWCASE
              </div>
              <h2 className="text-white text-2xl font-bold mb-2">
                {vehicle.year} {vehicle.make} {vehicle.model}
              </h2>
              <p className="text-gray-300 text-sm mb-4">
                Experience the epitome of luxury with this stunning{" "}
                {vehicle.color} {vehicle.model}. Every detail crafted for
                perfection.
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-[#2f3136] rounded p-3 text-center">
                <div className="text-[#00d9ff] text-lg font-bold">
                  ${vehicle.price?.toLocaleString()}
                </div>
                <div className="text-gray-400 text-xs">Starting Price</div>
              </div>
              <div className="bg-[#2f3136] rounded p-3 text-center">
                <div className="text-[#57f287] text-lg font-bold">
                  {vehicle.mileage?.toLocaleString()}
                </div>
                <div className="text-gray-400 text-xs">Miles</div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="space-y-2">
              <button className="w-full bg-[#2f3136] hover:bg-[#40444b] text-white py-2 px-4 rounded text-sm transition-colors">
                📅 Schedule Test Drive
              </button>
              <button className="w-full bg-[#2f3136] hover:bg-[#40444b] text-white py-2 px-4 rounded text-sm transition-colors">
                💰 Get Financing Options
              </button>
              <button className="w-full bg-[#2f3136] hover:bg-[#40444b] text-white py-2 px-4 rounded text-sm transition-colors">
                📞 Speak with Specialist
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Main Discord Showroom Component
const DiscordShowroom = ({ vehicles, customMedia }: DiscordShowroomProps) => {
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleWithMedia | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const featuredVehicle = selectedVehicle || vehicles[0];

  return (
    <div className="flex h-screen bg-[#36393f] text-white">
      {/* Discord Sidebar */}
      <DiscordSidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        <DiscordTopBar />

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto bg-[#36393f]">
          <div className="p-6">
            {/* Featured Vehicle */}
            {featuredVehicle && <FeaturedShowcase vehicle={featuredVehicle} />}

            {/* Vehicle Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {vehicles.map((vehicle, index) => (
                <VehicleQuestCard
                  key={
                    vehicle.id ||
                    `${vehicle.year}-${vehicle.make}-${vehicle.model}-${index}`
                  }
                  vehicle={vehicle}
                  index={index}
                  onClick={setSelectedVehicle}
                />
              ))}
            </div>

            {/* Activity Feed */}
            <div className="mt-8">
              <h3 className="text-white text-lg font-bold mb-4">
                Recent Activity
              </h3>
              <div className="bg-[#2f3136] rounded-lg p-4">
                <div className="space-y-3">
                  {[
                    {
                      user: "CarLover_Mike",
                      action: "completed a test drive",
                      vehicle: "Continental GT",
                      time: "2m ago",
                    },
                    {
                      user: "LuxurySeeker",
                      action: "scheduled an appointment",
                      vehicle: "Bentayga",
                      time: "5m ago",
                    },
                    {
                      user: "AutoEnthusiast",
                      action: "saved to favorites",
                      vehicle: "Flying Spur",
                      time: "8m ago",
                    },
                  ].map((activity, index) => (
                    <div
                      key={index}
                      className="flex items-center space-x-3 p-2 hover:bg-[#36393f] rounded"
                    >
                      <div className="w-8 h-8 bg-[#5865f2] rounded-full flex items-center justify-center">
                        <span className="text-white text-xs font-bold">
                          {activity.user[0]}
                        </span>
                      </div>
                      <div className="flex-1">
                        <p className="text-gray-300 text-sm">
                          <span className="text-white font-medium">
                            {activity.user}
                          </span>{" "}
                          {activity.action} for{" "}
                          <span className="text-[#00d9ff]">
                            {activity.vehicle}
                          </span>
                        </p>
                        <p className="text-gray-500 text-xs">{activity.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* AI Floating Chatbot */}
      <AIFloatingChatbot selectedVehicle={featuredVehicle} />

      <AnimatePresence>
        {selectedVehicle && (
          <Dialog open={true} onOpenChange={() => setSelectedVehicle(null)}>
            <DialogContent className="bg-transparent border-none p-0">
              <motion.div
                layoutId={`card-container-${selectedVehicle.id}`}
                className="bg-[#36393f] border border-black/20 text-white rounded-lg overflow-hidden"
              >
                <div className="space-y-4 p-6">
                  <DialogTitle className="text-2xl font-bold">
                    {selectedVehicle.year} {selectedVehicle.make} {selectedVehicle.model}
                  </DialogTitle>
                  <DialogDescription className="text-sm text-gray-400 space-y-1">
                    <p>Mileage: {selectedVehicle.mileage?.toLocaleString()} miles</p>
                    <p>Color: {selectedVehicle.color}</p>
                  </DialogDescription>
                  <div className="relative">
                    <img
                      src={selectedVehicle.images[0]}
                      alt={`${selectedVehicle.year} ${selectedVehicle.make} ${selectedVehicle.model}`}
                      className="w-full h-64 object-cover rounded-lg"
                    />
                  </div>
                  <p className="text-xl">${selectedVehicle.price?.toLocaleString()}</p>
                </div>
              </motion.div>
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DiscordShowroom;
