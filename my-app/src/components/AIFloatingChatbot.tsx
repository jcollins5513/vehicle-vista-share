"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  MessageCircle,
  X,
  Send,
  Bot,
  User,
  Minimize2,
  Maximize2,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Car,
  Sparkles,
  Zap,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import type { VehicleWithMedia } from "@/types";

interface Message {
  id: string;
  content: string;
  sender: "user" | "ai";
  timestamp: Date;
  vehicleContext?: VehicleWithMedia;
}

interface AIFloatingChatbotProps {
  selectedVehicle?: VehicleWithMedia;
}

const AIFloatingChatbot = ({ selectedVehicle }: AIFloatingChatbotProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [animationState, setAnimationState] = useState<
    "idle" | "thinking" | "speaking"
  >("idle");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  // Initialize with welcome message
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const welcomeMessage: Message = {
        id: Date.now().toString(),
        content: selectedVehicle
          ? `Hi! I'm ARIA, your AI automotive assistant. I see you're looking at the ${selectedVehicle.year} ${selectedVehicle.make} ${selectedVehicle.model}. How can I help you with this vehicle today?`
          : "Hi! I'm ARIA, your AI automotive assistant. I'm here to help you with any questions about our luxury vehicles. What would you like to know?",
        sender: "ai",
        timestamp: new Date(),
        vehicleContext: selectedVehicle,
      };
      setMessages([welcomeMessage]);
    }
  }, [isOpen, selectedVehicle]);

  // Update context when vehicle changes
  useEffect(() => {
    if (selectedVehicle && messages.length > 0) {
      const contextMessage: Message = {
        id: Date.now().toString(),
        content: `I see you're now looking at the ${selectedVehicle.year} ${selectedVehicle.make} ${selectedVehicle.model}. Would you like to know more about this vehicle?`,
        sender: "ai",
        timestamp: new Date(),
        vehicleContext: selectedVehicle,
      };
      setMessages((prev) => [...prev, contextMessage]);
    }
  }, [selectedVehicle?.id]);

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputMessage,
      sender: "user",
      timestamp: new Date(),
      vehicleContext: selectedVehicle,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage("");
    setIsLoading(true);
    setAnimationState("thinking");

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: inputMessage,
          vehicleData: selectedVehicle,
          context: "vehicle_showroom",
        }),
      });

      const data = await response.json();

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content:
          data.response ||
          "I apologize, but I'm having trouble responding right now. Please try again.",
        sender: "ai",
        timestamp: new Date(),
        vehicleContext: selectedVehicle,
      };

      setMessages((prev) => [...prev, aiMessage]);
      setAnimationState("speaking");

      // Speak the response if enabled
      if ("speechSynthesis" in window && isSpeaking) {
        const utterance = new SpeechSynthesisUtterance(aiMessage.content);
        utterance.rate = 0.9;
        utterance.pitch = 1.1;
        utterance.voice =
          speechSynthesis
            .getVoices()
            .find(
              (voice) =>
                voice.name.includes("Female") ||
                voice.name.includes("Samantha"),
            ) || speechSynthesis.getVoices()[0];
        speechSynthesis.speak(utterance);
      }

      setTimeout(() => setAnimationState("idle"), 2000);
    } catch (error) {
      console.error("Chat error:", error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content:
          "I'm having trouble connecting right now. Please try again in a moment!",
        sender: "ai",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
      setAnimationState("idle");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const toggleVoiceInput = () => {
    if ("webkitSpeechRecognition" in window) {
      setIsListening(!isListening);
      // Voice recognition implementation would go here
    }
  };

  const getAvatarAnimation = () => {
    switch (animationState) {
      case "thinking":
        return "animate-pulse bg-gradient-to-br from-purple-500 to-blue-500";
      case "speaking":
        return "animate-bounce bg-gradient-to-br from-green-500 to-cyan-500";
      default:
        return "bg-gradient-to-br from-cyan-500 to-purple-500";
    }
  };

  // Floating avatar button
  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <button onClick={() => setIsOpen(true)} className="relative group">
          {/* Pulsing rings */}
          <div className="absolute inset-0 rounded-full bg-cyan-400/30 animate-ping" />
          <div
            className="absolute inset-0 rounded-full bg-purple-400/20 animate-ping"
            style={{ animationDelay: "0.5s" }}
          />

          {/* Main avatar */}
          <div
            className={`relative w-16 h-16 rounded-full ${getAvatarAnimation()} flex items-center justify-center shadow-2xl hover:scale-110 transition-transform duration-300`}
          >
            <Bot className="w-8 h-8 text-white" />

            {/* Status indicator */}
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white animate-pulse" />

            {/* Notification badge */}
            {selectedVehicle && (
              <div className="absolute -top-2 -left-2 w-6 h-6 bg-gradient-to-r from-orange-400 to-pink-400 rounded-full flex items-center justify-center">
                <Car className="w-3 h-3 text-white" />
              </div>
            )}
          </div>

          {/* Tooltip */}
          <div className="absolute bottom-full right-0 mb-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="bg-black/80 text-white text-sm px-3 py-2 rounded-lg whitespace-nowrap">
              Chat with ARIA AI
              <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-black/80" />
            </div>
          </div>
        </button>
      </div>
    );
  }

  // Chat interface
  return (
    <div
      className={`fixed z-50 transition-all duration-300 ${
        isMinimized
          ? "bottom-6 right-6 w-80 h-16"
          : "bottom-6 right-6 w-96 h-[600px]"
      }`}
    >
      <Card className="h-full bg-[#2f3136] border border-gray-600 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-[#36393f] border-b border-gray-600 p-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div
              className={`w-10 h-10 rounded-full ${getAvatarAnimation()} flex items-center justify-center relative`}
            >
              <Bot className="w-5 h-5 text-white" />
              {animationState === "thinking" && (
                <div className="absolute inset-0 rounded-full border-2 border-white/50 animate-spin" />
              )}
            </div>
            <div>
              <h3 className="text-white font-bold text-sm">
                ARIA AI Assistant
              </h3>
              <p className="text-gray-400 text-xs">
                {isLoading
                  ? "Thinking..."
                  : selectedVehicle
                    ? `Helping with ${selectedVehicle.make} ${selectedVehicle.model}`
                    : "Ready to help"}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsSpeaking(!isSpeaking)}
              className="p-2 hover:bg-[#40444b] rounded transition-colors"
            >
              {isSpeaking ? (
                <Volume2 className="w-4 h-4 text-green-400" />
              ) : (
                <VolumeX className="w-4 h-4 text-gray-400" />
              )}
            </button>
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-2 hover:bg-[#40444b] rounded transition-colors"
            >
              {isMinimized ? (
                <Maximize2 className="w-4 h-4 text-gray-400" />
              ) : (
                <Minimize2 className="w-4 h-4 text-gray-400" />
              )}
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="p-2 hover:bg-[#40444b] rounded transition-colors"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        </div>

        {!isMinimized && (
          <>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[460px]">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`flex items-start space-x-2 max-w-[80%] ${
                      message.sender === "user"
                        ? "flex-row-reverse space-x-reverse"
                        : ""
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        message.sender === "user"
                          ? "bg-[#5865f2]"
                          : getAvatarAnimation()
                      }`}
                    >
                      {message.sender === "user" ? (
                        <User className="w-4 h-4 text-white" />
                      ) : (
                        <Bot className="w-4 h-4 text-white" />
                      )}
                    </div>
                    <div
                      className={`rounded-lg p-3 ${
                        message.sender === "user"
                          ? "bg-[#5865f2] text-white"
                          : "bg-[#40444b] text-gray-100"
                      }`}
                    >
                      <p className="text-sm">{message.content}</p>
                      <p className="text-xs opacity-70 mt-1">
                        {message.timestamp.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="flex items-start space-x-2">
                    <div
                      className={`w-8 h-8 rounded-full ${getAvatarAnimation()} flex items-center justify-center`}
                    >
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                    <div className="bg-[#40444b] rounded-lg p-3">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                        <div
                          className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                          style={{ animationDelay: "0.1s" }}
                        />
                        <div
                          className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                          style={{ animationDelay: "0.2s" }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="border-t border-gray-600 p-4">
              <div className="flex items-center space-x-2">
                <div className="flex-1 relative">
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder={
                      selectedVehicle
                        ? `Ask about the ${selectedVehicle.make} ${selectedVehicle.model}...`
                        : "Ask me anything about our vehicles..."
                    }
                    className="w-full bg-[#40444b] text-white border border-gray-600 rounded-lg px-4 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-[#5865f2] text-sm"
                    disabled={isLoading}
                  />
                  {selectedVehicle && (
                    <Car className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-cyan-400" />
                  )}
                </div>

                <button
                  onClick={toggleVoiceInput}
                  className={`p-2 rounded-lg transition-colors ${
                    isListening
                      ? "bg-red-500 text-white"
                      : "bg-[#40444b] text-gray-400 hover:text-white"
                  }`}
                >
                  {isListening ? (
                    <MicOff className="w-4 h-4" />
                  ) : (
                    <Mic className="w-4 h-4" />
                  )}
                </button>

                <button
                  onClick={sendMessage}
                  disabled={!inputMessage.trim() || isLoading}
                  className="bg-[#5865f2] hover:bg-[#4752c4] disabled:bg-gray-600 disabled:cursor-not-allowed text-white p-2 rounded-lg transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>

              {selectedVehicle && (
                <div className="mt-2 text-xs text-gray-400 flex items-center">
                  <Sparkles className="w-3 h-3 mr-1" />
                  Context: {selectedVehicle.year} {selectedVehicle.make}{" "}
                  {selectedVehicle.model}
                </div>
              )}
            </div>
          </>
        )}
      </Card>
    </div>
  );
};

export default AIFloatingChatbot;
