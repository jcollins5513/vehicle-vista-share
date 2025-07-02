"use client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Car, Users, Calendar, Sparkles, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const FloatingParticles = () => {
  const [particles, setParticles] = useState<
    Array<{ id: number; x: number; y: number; delay: number }>
  >([]);

  useEffect(() => {
    const newParticles = Array.from({ length: 20 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      delay: Math.random() * 20,
    }));
    setParticles(newParticles);
  }, []);

  return (
    <div className="particles">
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="particle"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            animationDelay: `${particle.delay}s`,
          }}
        />
      ))}
    </div>
  );
};

const Index = () => {
  const router = useRouter();
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  return (
    <div className="min-h-screen cosmic-gradient flex items-center justify-center p-4 relative overflow-hidden">
      <FloatingParticles />

      {/* Cosmic Rings */}
      <div
        className="cosmic-ring"
        style={{ width: "300px", height: "300px", top: "10%", left: "10%" }}
      />
      <div
        className="cosmic-ring"
        style={{
          width: "200px",
          height: "200px",
          top: "60%",
          right: "15%",
          animationDirection: "reverse",
          animationDuration: "15s",
        }}
      />
      <div
        className="cosmic-ring"
        style={{
          width: "150px",
          height: "150px",
          bottom: "20%",
          left: "20%",
          animationDuration: "8s",
        }}
      />
      <div className="max-w-4xl mx-auto text-center relative z-10">
        <div className={`mb-12 ${isLoaded ? "bounce-in" : "opacity-0"}`}>
          <div className="relative inline-block mb-6">
            <Sparkles className="absolute -top-4 -right-4 w-8 h-8 text-purple-300 floating" />
            <Zap className="absolute -bottom-2 -left-6 w-6 h-6 text-pink-300 floating-delayed" />
            <h1 className="text-6xl lg:text-7xl font-bold text-white mb-4 text-glow bg-gradient-to-r from-white via-purple-200 to-pink-200 bg-clip-text text-transparent">
              Bentley Supercenter
            </h1>
          </div>
          <p className="text-2xl text-white/90 font-light floating-slow">
            Professional Showroom Display & Customer Sharing System
          </p>
          <div className="mt-4 w-32 h-1 bg-gradient-to-r from-purple-400 to-pink-400 mx-auto rounded-full pulse-glow"></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          <Card
            className={`glass-card rounded-3xl p-8 card-magical hover-lift shimmer ${isLoaded ? "bounce-in" : "opacity-0"}`}
            style={{ animationDelay: "0.2s" }}
          >
            <div className="relative">
              <Car className="w-16 h-16 text-purple-300 mx-auto mb-6 floating drop-shadow-lg" />
              <div className="absolute -top-2 -right-2 w-4 h-4 bg-purple-400 rounded-full pulse-glow"></div>
            </div>
            <h3 className="text-white text-2xl font-bold mb-4 bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
              Showroom View
            </h3>
            <p className="text-white/80 mb-6 text-lg leading-relaxed">
              Full dealership display with inventory management, media control,
              and customer sharing tools.
            </p>
            <Button
              onClick={() => {
                // Add entrance animation
                document.body.style.transform = "scale(0.9)";
                document.body.style.opacity = "0.7";
                document.body.style.transition = "all 0.5s ease-in-out";

                setTimeout(() => {
                  router.push("/showroom");
                }, 500);
              }}
              className="w-full cosmic-button-enhanced text-white font-semibold py-4 text-lg rounded-2xl relative overflow-hidden group"
            >
              <span className="relative z-10">Enter Showroom ✨</span>
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/20 to-purple-400/20 transform translate-x-full group-hover:translate-x-0 transition-transform duration-500" />
            </Button>
          </Card>

          <Card
            className={`glass-card rounded-3xl p-8 card-magical hover-lift shimmer ${isLoaded ? "bounce-in" : "opacity-0"}`}
            style={{ animationDelay: "0.4s" }}
          >
            <div className="relative">
              <Users className="w-16 h-16 text-pink-300 mx-auto mb-6 floating-delayed drop-shadow-lg" />
              <div className="absolute -top-2 -right-2 w-4 h-4 bg-pink-400 rounded-full pulse-glow"></div>
            </div>
            <h3 className="text-white text-2xl font-bold mb-4 bg-gradient-to-r from-white to-pink-200 bg-clip-text text-transparent">
              Customer View
            </h3>
            <p className="text-white/80 mb-6 text-lg leading-relaxed">
              Secure customer experience with vehicle details, booking, and
              limited access to inventory.
            </p>
            <Button
              onClick={() => router.push("/customer/1")}
              className="w-full cosmic-button-enhanced text-white font-semibold py-4 text-lg rounded-2xl"
            >
              View Sample Customer Page 🚗
            </Button>
          </Card>
        </div>

        <div
          className={`glass-card rounded-2xl p-8 hover-glow ${isLoaded ? "bounce-in" : "opacity-0"}`}
          style={{ animationDelay: "0.6s" }}
        >
          <div className="flex items-center justify-center mb-6">
            <Calendar className="w-8 h-8 text-purple-300 mr-3 floating-slow" />
            <span className="text-white text-lg font-semibold bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
              Ready for Integration
            </span>
          </div>
          <p className="text-white/80 leading-relaxed">
            This system is designed to integrate with Google Calendar for
            appointments, Facebook for social sharing, and your Neon PostgreSQL
            database for vehicle inventory.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Index;
