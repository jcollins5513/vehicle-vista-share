"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
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
  Mic,
  MicOff,
  Brain,
  Wand2,
  Sparkles,
  Camera,
  Share2,
  MessageCircle,
  Users,
  CloudRain,
  Sun,
  Moon,
  Wind,
  Thermometer,
  MapPin,
  Clock,
  Smartphone,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import type { VehicleWithMedia, Media, SlideshowItem } from "@/types";

interface QuantumShowroomProps {
  vehicles: VehicleWithMedia[];
  customMedia: Media[];
}

// Advanced Particle Physics Engine
const AdvancedParticleSystem = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particles = useRef<
    Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      color: string;
      life: number;
      maxLife: number;
      type: "spark" | "energy" | "data" | "quantum";
    }>
  >([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Initialize particles
    for (let i = 0; i < 100; i++) {
      particles.current.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        size: Math.random() * 3 + 1,
        color: ["#6366f1", "#8b5cf6", "#06b6d4", "#10b981"][
          Math.floor(Math.random() * 4)
        ],
        life: Math.random() * 100,
        maxLife: 100,
        type: ["spark", "energy", "data", "quantum"][
          Math.floor(Math.random() * 4)
        ] as any,
      });
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.current.forEach((particle, index) => {
        // Update particle position
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.life -= 0.5;

        // Wrap around screen
        if (particle.x < 0) particle.x = canvas.width;
        if (particle.x > canvas.width) particle.x = 0;
        if (particle.y < 0) particle.y = canvas.height;
        if (particle.y > canvas.height) particle.y = 0;

        // Reset if life is over
        if (particle.life <= 0) {
          particle.life = particle.maxLife;
          particle.x = Math.random() * canvas.width;
          particle.y = Math.random() * canvas.height;
        }

        // Draw particle based on type
        const alpha = particle.life / particle.maxLife;
        ctx.globalAlpha = alpha;

        switch (particle.type) {
          case "spark":
            ctx.fillStyle = particle.color;
            ctx.fillRect(particle.x, particle.y, particle.size, particle.size);
            break;
          case "energy":
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            ctx.fillStyle = particle.color;
            ctx.fill();
            ctx.shadowBlur = 10;
            ctx.shadowColor = particle.color;
            break;
          case "data":
            ctx.strokeStyle = particle.color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(particle.x, particle.y);
            ctx.lineTo(
              particle.x + particle.vx * 10,
              particle.y + particle.vy * 10,
            );
            ctx.stroke();
            break;
          case "quantum":
            ctx.fillStyle = particle.color;
            ctx.fillRect(particle.x, particle.y, 1, 1);
            // Quantum entanglement lines
            particles.current.slice(index + 1, index + 4).forEach((other) => {
              const distance = Math.sqrt(
                (particle.x - other.x) ** 2 + (particle.y - other.y) ** 2,
              );
              if (distance < 100) {
                ctx.strokeStyle = particle.color;
                ctx.lineWidth = 0.5;
                ctx.globalAlpha = ((100 - distance) / 100) * alpha;
                ctx.beginPath();
                ctx.moveTo(particle.x, particle.y);
                ctx.lineTo(other.x, other.y);
                ctx.stroke();
              }
            });
            break;
        }
      });

      requestAnimationFrame(animate);
    };

    animate();

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ mixBlendMode: "screen" }}
    />
  );
};

// AI Virtual Assistant Avatar
const AIAssistant = ({
  isActive,
  onToggle,
}: {
  isActive: boolean;
  onToggle: () => void;
}) => {
  const [isThinking, setIsThinking] = useState(false);
  const [message, setMessage] = useState(
    "Hello! I'm ARIA, your AI automotive assistant. How can I help you today?",
  );
  const [audioLevel, setAudioLevel] = useState(0);

  useEffect(() => {
    if (isActive) {
      const interval = setInterval(() => {
        setAudioLevel(Math.random() * 100);
      }, 100);
      return () => clearInterval(interval);
    }
  }, [isActive]);

  const messages = [
    "This vehicle features advanced safety systems and premium leather interior.",
    "Based on market analysis, this price is 12% below average for similar vehicles.",
    "Would you like me to schedule a test drive or provide financing options?",
    "I can show you the vehicle's maintenance history and accident reports.",
    "Comparing this to 15 similar vehicles in our database...",
  ];

  useEffect(() => {
    if (isActive) {
      const interval = setInterval(() => {
        setIsThinking(true);
        setTimeout(() => {
          setMessage(messages[Math.floor(Math.random() * messages.length)]);
          setIsThinking(false);
        }, 2000);
      }, 8000);
      return () => clearInterval(interval);
    }
  }, [isActive]);

  return (
    <div
      className={`fixed bottom-8 right-8 z-50 transition-all duration-500 ${isActive ? "scale-100" : "scale-0"}`}
    >
      <Card className="glass-card-dark p-6 w-80 hover-lift">
        {/* Avatar */}
        <div className="flex items-start space-x-4 mb-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-400 to-purple-500 flex items-center justify-center relative overflow-hidden">
              <Brain
                className={`w-8 h-8 text-white ${isThinking ? "animate-pulse" : ""}`}
              />

              {/* AI Thinking Animation */}
              {isThinking && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
              )}

              {/* Audio Visualization */}
              {isActive && (
                <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 flex space-x-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div
                      key={i}
                      className="w-1 bg-cyan-400 rounded-full transition-all duration-150"
                      style={{
                        height: `${(audioLevel * (i + 1)) / 100 + 4}px`,
                      }}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Status Indicator */}
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full pulse-glow" />
          </div>

          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <h3 className="text-white font-bold">ARIA</h3>
              <span className="text-xs bg-gradient-to-r from-cyan-400 to-purple-400 text-white px-2 py-1 rounded-full">
                AI Assistant
              </span>
            </div>
            <div className="text-cyan-300 text-sm">
              {isThinking ? (
                <div className="flex items-center">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" />
                    <div
                      className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce"
                      style={{ animationDelay: "0.1s" }}
                    />
                    <div
                      className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce"
                      style={{ animationDelay: "0.2s" }}
                    />
                  </div>
                  <span className="ml-2">Analyzing...</span>
                </div>
              ) : (
                message
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-2">
          <button className="cosmic-button-enhanced p-2 rounded-lg text-xs text-white">
            <Mic className="w-4 h-4 mx-auto mb-1" />
            Voice Mode
          </button>
          <button className="cosmic-button-enhanced p-2 rounded-lg text-xs text-white">
            <Camera className="w-4 h-4 mx-auto mb-1" />
            Scan Vehicle
          </button>
        </div>
      </Card>

      {/* Toggle Button */}
      <button
        onClick={onToggle}
        className="absolute -top-4 -left-4 cosmic-button-enhanced p-3 rounded-full text-white shadow-xl hover:scale-110 transition-transform"
      >
        <Brain className="w-6 h-6" />
      </button>
    </div>
  );
};

// Weather & Environment System
const EnvironmentController = () => {
  const [weather, setWeather] = useState({
    condition: "clear",
    temperature: 72,
    time: "day",
  });

  const weatherEffects = {
    clear: { icon: Sun, color: "text-yellow-400", effect: "brightness-110" },
    rain: {
      icon: CloudRain,
      color: "text-blue-400",
      effect: "brightness-75 contrast-125",
    },
    night: {
      icon: Moon,
      color: "text-purple-400",
      effect: "brightness-50 contrast-150",
    },
    wind: {
      icon: Wind,
      color: "text-cyan-400",
      effect: "brightness-90 saturate-125",
    },
  };

  const current =
    weatherEffects[weather.condition as keyof typeof weatherEffects];

  useEffect(() => {
    const conditions = Object.keys(weatherEffects);
    const interval = setInterval(() => {
      setWeather((prev) => ({
        ...prev,
        condition: conditions[Math.floor(Math.random() * conditions.length)],
        temperature: Math.floor(Math.random() * 20) + 65,
      }));
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed top-8 left-1/2 transform -translate-x-1/2 z-40">
      <Card className="glass-card-dark p-4 hover-glow">
        <div className="flex items-center space-x-4">
          <current.icon className={`w-6 h-6 ${current.color} floating`} />
          <div className="text-white">
            <div className="text-lg font-bold">{weather.temperature}°F</div>
            <div className="text-xs opacity-70 capitalize">
              {weather.condition}
            </div>
          </div>
          <Thermometer className="w-4 h-4 text-white/50" />
        </div>
      </Card>

      {/* Environment Filter Overlay */}
      <div
        className={`fixed inset-0 pointer-events-none ${current.effect} transition-all duration-3000 z-0`}
      />
    </div>
  );
};

// Live Social Feed
const SocialFeed = () => {
  const [posts, setPosts] = useState([
    {
      user: "CarEnthusiast_Mike",
      text: "Just picked up my dream car! 🚗✨",
      time: "2m ago",
      likes: 23,
    },
    {
      user: "AutoLover_Sarah",
      text: "The service here is incredible! Highly recommend 👍",
      time: "5m ago",
      likes: 18,
    },
    {
      user: "SpeedDemon_Jay",
      text: "Test drove the new model today... WOW! 🔥",
      time: "8m ago",
      likes: 31,
    },
  ]);

  useEffect(() => {
    const newPosts = [
      "This showroom display is absolutely mind-blowing! 🤯",
      "Technology like this is the future of car shopping 🚀",
      "Never seen anything like this at a dealership before!",
      "The AI assistant is incredibly helpful! 🤖",
      "Just scheduled my test drive through the holographic interface ✨",
    ];

    const interval = setInterval(() => {
      setPosts((prev) => {
        const newPost = {
          user: `User_${Math.floor(Math.random() * 999)}`,
          text: newPosts[Math.floor(Math.random() * newPosts.length)],
          time: "now",
          likes: Math.floor(Math.random() * 15) + 1,
        };
        return [newPost, ...prev.slice(0, 2)];
      });
    }, 8000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-3">
      {posts.map((post, index) => (
        <div
          key={index}
          className={`glass-card-dark p-3 rounded-xl hover-glow bounce-in`}
          style={{ animationDelay: `${index * 0.1}s` }}
        >
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-purple-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
              {post.user[0]}
            </div>
            <div className="flex-1">
              <div className="text-cyan-300 text-sm font-semibold">
                {post.user}
              </div>
              <div className="text-white/80 text-sm">{post.text}</div>
              <div className="flex items-center space-x-4 mt-2 text-xs text-white/50">
                <span>{post.time}</span>
                <div className="flex items-center space-x-1">
                  <Star className="w-3 h-3" />
                  <span>{post.likes}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// Gesture Recognition Simulator
const GestureController = ({
  onGesture,
}: {
  onGesture: (gesture: string) => void;
}) => {
  const [activeGesture, setActiveGesture] = useState<string | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);

  const gestures = [
    { name: "swipe_left", icon: "👈", description: "Previous Vehicle" },
    { name: "swipe_right", icon: "👉", description: "Next Vehicle" },
    { name: "wave", icon: "👋", description: "Activate AI" },
    { name: "peace", icon: "✌️", description: "Take Photo" },
    { name: "thumbs_up", icon: "👍", description: "Like Vehicle" },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() > 0.85) {
        const gesture = gestures[Math.floor(Math.random() * gestures.length)];
        setActiveGesture(gesture.name);
        setIsDetecting(true);
        onGesture(gesture.name);

        setTimeout(() => {
          setActiveGesture(null);
          setIsDetecting(false);
        }, 2000);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [onGesture]);

  return (
    <div className="fixed top-1/2 left-8 transform -translate-y-1/2 z-40">
      <Card className="glass-card-dark p-4 w-48">
        <div className="flex items-center space-x-2 mb-3">
          <Wand2 className="w-5 h-5 text-purple-400" />
          <span className="text-white font-semibold text-sm">
            Gesture Control
          </span>
        </div>

        {isDetecting && (
          <div className="mb-3 p-2 bg-green-500/20 rounded-lg border border-green-500/30">
            <div className="text-green-300 text-sm font-semibold">
              Gesture Detected!
            </div>
            <div className="text-white text-xs">
              {gestures.find((g) => g.name === activeGesture)?.description}
            </div>
          </div>
        )}

        <div className="space-y-2">
          {gestures.map((gesture) => (
            <div
              key={gesture.name}
              className={`flex items-center space-x-2 p-2 rounded-lg transition-all ${
                activeGesture === gesture.name
                  ? "bg-purple-500/30 scale-105"
                  : "bg-white/5"
              }`}
            >
              <span className="text-lg">{gesture.icon}</span>
              <span className="text-white/70 text-xs">
                {gesture.description}
              </span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

// Main Quantum Showroom Component
const QuantumShowroom = ({ vehicles, customMedia }: QuantumShowroomProps) => {
  const [selectedVehicle, setSelectedVehicle] = useState(vehicles[0]);
  const [isAIActive, setIsAIActive] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [gestureMode, setGestureMode] = useState(true);
  const [voiceMode, setVoiceMode] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handleGesture = useCallback(
    (gesture: string) => {
      switch (gesture) {
        case "swipe_left":
          setCurrentSlide(
            (prev) => (prev - 1 + vehicles.length) % vehicles.length,
          );
          break;
        case "swipe_right":
          setCurrentSlide((prev) => (prev + 1) % vehicles.length);
          break;
        case "wave":
          setIsAIActive(true);
          break;
        case "peace":
          // Trigger photo capture effect
          break;
        case "thumbs_up":
          // Add vehicle to favorites
          break;
      }
    },
    [vehicles.length],
  );

  useEffect(() => {
    if (vehicles[currentSlide]) {
      setSelectedVehicle(vehicles[currentSlide]);
    }
  }, [currentSlide, vehicles]);

  const featuredVehicle = selectedVehicle || vehicles[0];

  return (
    <div className="fixed inset-0 cosmic-gradient overflow-hidden">
      {/* Advanced Particle Physics */}
      <AdvancedParticleSystem />

      {/* Environment Controller */}
      <EnvironmentController />

      {/* Gesture Recognition */}
      {gestureMode && <GestureController onGesture={handleGesture} />}

      {/* AI Assistant */}
      <AIAssistant
        isActive={isAIActive}
        onToggle={() => setIsAIActive(!isAIActive)}
      />

      {/* Main Content */}
      <div className="relative z-10 h-full flex flex-col">
        {/* Quantum Header */}
        <div className="flex justify-between items-center p-8">
          <div className="glass-card rounded-2xl p-6 hover-lift floating">
            <h1 className="text-4xl font-bold text-white text-glow bg-gradient-to-r from-white via-cyan-200 to-purple-200 bg-clip-text text-transparent">
              Bentley Supercenter
            </h1>
            <p className="text-cyan-200 text-lg mt-2">
              Quantum Automotive Experience
            </p>
            <div className="flex items-center space-x-2 mt-2">
              <div className="w-2 h-2 bg-green-400 rounded-full pulse-glow" />
              <span className="text-green-300 text-sm">AI Systems Online</span>
            </div>
          </div>

          {/* Advanced Control Panel */}
          <div className="flex space-x-4">
            <button
              onClick={() => setGestureMode(!gestureMode)}
              className={`cosmic-button-enhanced p-4 rounded-xl text-white hover:scale-110 transition-transform ${gestureMode ? "ring-2 ring-cyan-400" : ""}`}
            >
              <Wand2 size={24} />
            </button>

            <button
              onClick={() => setVoiceMode(!voiceMode)}
              className={`cosmic-button-enhanced p-4 rounded-xl text-white hover:scale-110 transition-transform ${voiceMode ? "ring-2 ring-purple-400" : ""}`}
            >
              {voiceMode ? <Mic size={24} /> : <MicOff size={24} />}
            </button>

            <button
              onClick={() => setIsAIActive(!isAIActive)}
              className={`cosmic-button-enhanced p-4 rounded-xl text-white hover:scale-110 transition-transform ${isAIActive ? "ring-2 ring-green-400" : ""}`}
            >
              <Brain size={24} />
            </button>
          </div>
        </div>

        {/* Main Showcase */}
        <div className="flex-1 flex gap-8 p-8">
          {/* Holographic Vehicle Display */}
          <div className="flex-1">
            <Card className="cosmic-slideshow rounded-3xl p-8 h-full hover-lift pulse-glow relative overflow-hidden">
              {/* Quantum Vehicle Image */}
              <div className="relative h-96 mb-8 rounded-2xl overflow-hidden group">
                {featuredVehicle?.images && featuredVehicle.images[0] && (
                  <img
                    src={featuredVehicle.images[0]}
                    alt={`${featuredVehicle.year} ${featuredVehicle.make} ${featuredVehicle.model}`}
                    className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-1000 cinematic-zoom"
                  />
                )}

                {/* Holographic Overlay Grid */}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/20" />
                <div
                  className={
                    'absolute inset-0 bg-[url(\'data:image/svg+xml,%3Csvg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="%23ffffff" fill-opacity="0.03"%3E%3Cpath d="M0 0h40v40H0z"/%3E%3Cpath d="M20 0v40M0 20h40"/%3E%3C/g%3E%3C/svg%3E\')] opacity-30'
                  }
                />

                {/* Floating Vehicle Info */}
                <div className="absolute bottom-6 left-6 right-6">
                  <div className="glass-card-dark rounded-2xl p-6 backdrop-blur-xl">
                    <h2 className="text-4xl font-bold text-white mb-2 bg-gradient-to-r from-white to-cyan-200 bg-clip-text text-transparent">
                      {featuredVehicle?.year} {featuredVehicle?.make}{" "}
                      {featuredVehicle?.model}
                    </h2>
                    <div className="flex items-center space-x-6 text-lg">
                      <span className="text-emerald-400 font-bold text-2xl neon-glow">
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

                    {/* Quantum Action Buttons */}
                    <div className="flex space-x-4 mt-4">
                      <button className="cosmic-button-enhanced px-6 py-3 rounded-xl text-white font-medium shimmer">
                        🚗 Schedule Test Drive
                      </button>
                      <button className="glass-card-dark px-6 py-3 rounded-xl text-white border border-white/20 hover:border-cyan-400 transition-colors">
                        🔄 View 360°
                      </button>
                      <button className="glass-card-dark px-6 py-3 rounded-xl text-white border border-white/20 hover:border-purple-400 transition-colors">
                        📱 AR Experience
                      </button>
                    </div>
                  </div>
                </div>

                {/* Advanced Holographic Scan Effects */}
                <div className="absolute inset-0 pointer-events-none">
                  <div className="w-full h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-50 animate-pulse hologram-scan" />
                  <div
                    className="w-full h-1 bg-gradient-to-r from-transparent via-purple-400 to-transparent opacity-50 animate-pulse hologram-scan"
                    style={{ animationDelay: "1s" }}
                  />
                  <div className="absolute top-4 right-4 text-cyan-400 text-xs font-mono opacity-70">
                    QUANTUM_SCAN_ACTIVE
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Advanced Sidebar */}
          <div className="w-96 space-y-6">
            {/* Live Social Feed */}
            <Card className="glass-card rounded-2xl p-6">
              <h3 className="text-white text-xl font-bold mb-4 flex items-center">
                <MessageCircle className="w-6 h-6 mr-3 text-cyan-400" />
                Live Social Feed
              </h3>
              <SocialFeed />
            </Card>

            {/* Quantum Vehicle Stats */}
            <Card className="glass-card rounded-2xl p-6">
              <h3 className="text-white text-xl font-bold mb-4 flex items-center">
                <Zap className="w-6 h-6 mr-3 text-yellow-400" />
                Quantum Analytics
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="glass-card-dark p-4 rounded-xl hover-glow">
                  <Eye className="w-6 h-6 text-cyan-400 mb-2" />
                  <p className="text-cyan-400 text-2xl font-bold counter-animation">
                    2,847
                  </p>
                  <p className="text-white/70 text-xs">Virtual Views</p>
                </div>

                <div className="glass-card-dark p-4 rounded-xl hover-glow">
                  <Brain className="w-6 h-6 text-purple-400 mb-2" />
                  <p className="text-purple-400 text-2xl font-bold">97.3%</p>
                  <p className="text-white/70 text-xs">AI Match Score</p>
                </div>

                <div className="glass-card-dark p-4 rounded-xl hover-glow">
                  <Smartphone className="w-6 h-6 text-emerald-400 mb-2" />
                  <p className="text-emerald-400 text-2xl font-bold">156</p>
                  <p className="text-white/70 text-xs">AR Interactions</p>
                </div>

                <div className="glass-card-dark p-4 rounded-xl hover-glow">
                  <Award className="w-6 h-6 text-yellow-400 mb-2" />
                  <p className="text-yellow-400 text-2xl font-bold">A+</p>
                  <p className="text-white/70 text-xs">Safety Rating</p>
                </div>
              </div>
            </Card>

            {/* Vehicle Gallery with 3D Cards */}
            <Card className="glass-card rounded-2xl p-6">
              <h3 className="text-white text-xl font-bold mb-4">
                Quantum Inventory
              </h3>
              <div className="space-y-4 max-h-64 overflow-y-auto custom-scrollbar">
                {vehicles.slice(0, 4).map((vehicle, index) => (
                  <div
                    key={vehicle.id}
                    onClick={() => setSelectedVehicle(vehicle)}
                    className={`vehicle-card-3d cursor-pointer p-4 rounded-xl ${
                      selectedVehicle?.id === vehicle.id
                        ? "glass-card ring-2 ring-cyan-400"
                        : "glass-card-dark"
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      {vehicle.images && vehicle.images[0] && (
                        <img
                          src={vehicle.images[0]}
                          alt={vehicle.model}
                          className="w-12 h-12 rounded-lg object-cover"
                        />
                      )}
                      <div className="flex-1">
                        <div className="text-white font-semibold text-sm">
                          {vehicle.year} {vehicle.make} {vehicle.model}
                        </div>
                        <div className="text-emerald-400 text-sm">
                          ${vehicle.price?.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Ambient Sound Visualizer */}
      <div className="fixed bottom-4 left-4 flex space-x-1 z-40">
        {Array.from({ length: 30 }).map((_, i) => (
          <div
            key={i}
            className="w-1 bg-gradient-to-t from-cyan-400 via-purple-400 to-pink-400 rounded-full animate-pulse opacity-60"
            style={{
              height: `${Math.random() * 60 + 10}px`,
              animationDelay: `${i * 0.05}s`,
              animationDuration: `${Math.random() * 1 + 0.5}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default QuantumShowroom;
