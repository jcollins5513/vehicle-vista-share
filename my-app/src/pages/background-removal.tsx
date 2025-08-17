import React from 'react';
import { BackgroundRemovalPanel } from '@/components/BackgroundRemovalPanel';

export default function BackgroundRemovalPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Vehicle Background Removal</h1>
          <p className="text-gray-600">
            Process vehicle photos to remove backgrounds using AI-powered background removal technology.
            This tool works with your existing vehicle inventory stored in Redis.
          </p>
        </div>
        
        <BackgroundRemovalPanel />
        
        <div className="mt-8 p-4 bg-blue-50 rounded-lg">
          <h2 className="font-semibold mb-2">How it works:</h2>
          <ul className="text-sm text-gray-700 space-y-1">
            <li>• Fetches vehicle data and image URLs from your Redis database</li>
            <li>• Downloads original images from the provided URLs</li>
            <li>• Uses Python backgroundremover to process each image</li>
            <li>• Uploads processed images to your AWS S3 bucket</li>
            <li>• Updates vehicle records with processed image URLs</li>
          </ul>
        </div>
      </div>
    </div>
  );
}