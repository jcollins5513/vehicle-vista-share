'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import type { WebCompanionUpload } from '@/types/webCompanion';
import { Loader2, RefreshCcw, Search } from 'lucide-react';
import { MediaCarousel } from '@/components/MediaCarousel';
import Link from 'next/link';

export default function WebCompanionGalleryPage() {
  const [uploads, setUploads] = useState<WebCompanionUpload[]>([]);
  const [stockFilter, setStockFilter] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadUploads = useCallback(
    async (opts?: { quiet?: boolean }) => {
      if (!opts?.quiet) {
        setIsLoading(true);
      }
      setError(null);
      try {
        const query = stockFilter ? `?stockNumber=${encodeURIComponent(stockFilter)}` : '';
        const response = await fetch(`/api/web-companion/gallery${query}`);
        const data = await response.json();
        if (data.success) {
          setUploads(data.uploads);
        } else {
          setError(data.error || 'Failed to load uploads');
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load uploads';
        setError(message);
      } finally {
        if (!opts?.quiet) {
          setIsLoading(false);
        }
      }
    },
    [stockFilter]
  );

  useEffect(() => {
    loadUploads();
    const interval = setInterval(() => loadUploads({ quiet: true }), 8000);
    return () => clearInterval(interval);
  }, [loadUploads]);

  const stats = useMemo(() => {
    const byStock = uploads.reduce<Record<string, number>>((acc, upload) => {
      acc[upload.stockNumber] = (acc[upload.stockNumber] || 0) + 1;
      return acc;
    }, {});
    return { total: uploads.length, byStock };
  }, [uploads]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="container mx-auto px-4 py-10 space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-semibold">Web Companion Gallery</h1>
            <p className="text-white/70">
              Processed images that were uploaded to the web companion queue. Background removal
              happens in-browser; this view shows the processed results.
            </p>
          </div>
          <Badge variant="outline" className="bg-white/10 border-white/20">
            Total: {stats.total}
          </Badge>
        </div>

        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="w-4 h-4" />
              Filter by Stock Number
            </CardTitle>
            <CardDescription className="text-white/70">
              Leave empty to show all processed uploads.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <Input
                placeholder="e.g. ABC123"
                value={stockFilter}
                onChange={(e) => setStockFilter(e.target.value)}
                className="bg-white/10 border-white/20 text-white"
              />
              <div className="flex gap-2">
                <Button onClick={() => loadUploads()} disabled={isLoading} className="whitespace-nowrap">
                  {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Apply
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setStockFilter('');
                    loadUploads();
                  }}
                  className="border-white/30 text-white"
                >
                  <RefreshCcw className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </div>
            {error && <p className="text-red-300 text-sm">Error: {error}</p>}
            <Separator className="bg-white/10" />
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byStock).map(([stock, count]) => (
                <Badge key={stock} variant="outline" className="bg-white/10 border-white/20">
                  {stock}: {count}
                </Badge>
              ))}
              {stats.total === 0 && <p className="text-white/60 text-sm">No processed uploads yet.</p>}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {uploads.map((upload) => (
            <Card key={upload.id} className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-2">
                  <span className="truncate">{upload.originalFilename || 'Capture'}</span>
                  <Badge variant="outline" className="bg-green-500/10 border-green-500/30 text-green-200">
                    processed
                  </Badge>
                </CardTitle>
                <CardDescription className="text-white/70">
                  Stock {upload.stockNumber} · #{upload.imageIndex ?? 0}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <MediaCarousel
                  images={
                    [
                      upload.processedUrl && { url: upload.processedUrl, alt: upload.originalFilename || 'Processed image' },
                      upload.originalUrl && { url: upload.originalUrl, alt: 'Original image' },
                    ].filter(Boolean) as { url: string; alt?: string }[]
                  }
                />

                <div className="space-y-1 text-sm text-white/70">
                  <p>
                    Original:{' '}
                    {upload.originalUrl ? (
                      <Link href={upload.originalUrl} target="_blank" className="text-blue-300 underline">
                        View
                      </Link>
                    ) : (
                      'not provided'
                    )}
                  </p>
                  <p>
                    Processed:{' '}
                    {upload.processedUrl ? (
                      <Link href={upload.processedUrl} target="_blank" className="text-blue-300 underline">
                        View
                      </Link>
                    ) : (
                      'pending'
                    )}
                  </p>
                  <p>
                    Processed at:{' '}
                    {upload.processedAt
                      ? new Date(upload.processedAt).toLocaleString()
                      : 'pending'}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

