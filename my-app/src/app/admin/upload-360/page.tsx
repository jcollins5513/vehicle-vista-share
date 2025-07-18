"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function Upload360Page() {
  const [stockNumber, setStockNumber] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !stockNumber) {
      setMessage('Please provide both a stock number and a file.');
      return;
    }

    setIsUploading(true);
    setMessage('Uploading...');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('stockNumber', stockNumber);

    try {
      const response = await fetch('/api/upload-360', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Something went wrong');
      }

      setMessage(`Successfully uploaded! Image URL: ${data.imageUrl}`);
      setStockNumber('');
      setFile(null);
      // Reset file input
      const fileInput = document.getElementById('file-input') as HTMLInputElement;
      if(fileInput) fileInput.value = '';

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      setMessage(`Upload failed: ${errorMessage}`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Upload 360° Vehicle Image</CardTitle>
          <CardDescription>Select a file and enter the vehicle&apos;s stock number.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="stockNumber">Stock Number</Label>
              <Input
                id="stockNumber"
                type="text"
                placeholder="e.g., 12345A"
                value={stockNumber}
                onChange={(e) => setStockNumber(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="file-input">360° Image File</Label>
              <Input id="file-input" type="file" onChange={handleFileChange} required />
            </div>
            <Button type="submit" className="w-full" disabled={isUploading}>
              {isUploading ? 'Uploading...' : 'Upload'}
            </Button>
          </form>
          {message && <p className="mt-4 text-center text-sm text-gray-600 dark:text-gray-300">{message}</p>}
        </CardContent>
      </Card>
    </div>
  );
}
