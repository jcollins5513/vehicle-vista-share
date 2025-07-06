"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface ModalProps {
  children: React.ReactNode;
  isOpen: boolean;
  onClose: () => void;
}

export default function Modal({ children, isOpen, onClose }: ModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
  }, [isOpen]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      }
    }

    if (isOpen) {
      window.addEventListener("keydown", onKeyDown);
      return () => window.removeEventListener("keydown", onKeyDown);
    }
  }, [isOpen, onClose]);

  if (!mounted || !isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] overflow-y-auto">
      <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white p-6 rounded-xl max-w-2xl w-full mx-auto shadow-xl">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }} 
            className="absolute right-4 top-4 text-2xl text-gray-500 hover:text-gray-700"
          >
            ×
          </button>
          {children}
        </div>
      </div>
    </div>,
    document.getElementById("modal-root") as HTMLElement
  );
}
