'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { DragAndDropUpload } from '@/components/DragAndDropUpload';
import { removeBackground } from '@/utils/removeBackground';
import type { WebCompanionUpload } from '@/types/webCompanion';
import {
  ArrowLeft,
  Camera,
  CheckCircle,
  ExternalLink,
  Loader2,
  RefreshCcw,
  Sparkles,
  XCircle,
} from 'lucide-react';

interface ProcessResult {
  id: string;
  status: 'success' | 'failed';
  message: string;
  processedUrl?: string;
}

export default function WebCompanionSessionPage() {
  const params = useParams<{ stockNumber?: string }>();
  const router = useRouter();
  const stockNumberParam = params?.stockNumber;

  if (!stockNumberParam) {
    throw new Error('Missing stock number in route params');
  }

  const stockNumber = decodeURIComponent(stockNumberParam);

  const [uploads, setUploads] = useState<WebCompanionUpload[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<ProcessResult[]>([]);
  const [autoProcess, setAutoProcess] = useState(true);
  const processingRef = useRef(false);

  const pendingUploads = useMemo(
    () => uploads.filter((upload) => upload.status === 'pending'),
    [uploads]
  );

  const fetchUploads = useCallback(
    async (status?: 'pending' | 'processed') => {
      setIsLoading(true);
      try {
        const query = status ? `&status=${status}` : '';
        const response = await fetch(
          `/api/web-companion/uploads?stockNumber=${encodeURIComponent(stockNumber)}${query}`
        );
        const data = await response.json();
        if (data.success) {
          setUploads(data.uploads);
        } else {
          console.error('Failed to load uploads', data.error);
        }
      } catch (error) {
        console.error('Error loading uploads', error);
      } finally {
        setIsLoading(false);
      }
    },
    [stockNumber]
  );

  const markUpload = useCallback(
    async (uploadId: string, status: 'processed' | 'failed', processedUrl?: string, imageIndex?: number, error?: string) => {
      try {
        await fetch('/api/web-companion/uploads/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            uploadId,
            status,
            processedUrl,
            imageIndex,
            error,
          }),
        });
      } catch (err) {
        console.error('Failed to mark upload', err);
      }
    },
    []
  );

  const processUpload = useCallback(
    async (upload: WebCompanionUpload) => {
      const logResult = (result: ProcessResult) => {
        setResults((prev) => [result, ...prev].slice(0, 20));
      };

      try {
        const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(upload.originalUrl)}`;
        const response = await fetch(proxyUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch image (${response.status})`);
        }
        const blob = await response.blob();
        const file = new File(
          [blob],
          upload.originalFilename || `capture-${upload.imageIndex ?? '0'}.jpg`,
          { type: blob.type || 'image/jpeg' }
        );

        const processedBlob = await removeBackground(file);

        const formData = new FormData();
        formData.append('image', processedBlob, `processed-${upload.imageIndex ?? '0'}.png`);
        formData.append('uploadId', upload.id);
        formData.append('stockNumber', stockNumber);
        formData.append('originalUrl', upload.originalUrl);
        formData.append('imageIndex', String(upload.imageIndex ?? 0));

        const processedResponse = await fetch(
          `/api/web-companion/uploads/processed`,
          { method: 'POST', body: formData }
        );

        if (!processedResponse.ok) {
          throw new Error(`Failed to save processed image (${processedResponse.status})`);
        }

        const processedJson = await processedResponse.json();
        const processedUrl = processedJson?.upload?.processedUrl as string | undefined;

        setUploads((prev) =>
          prev.map((item) =>
            item.id === upload.id
              ? {
                  ...item,
                  status: 'processed',
                  processedUrl: processedUrl ?? item.processedUrl,
                  processedAt: processedJson?.upload?.processedAt ?? new Date().toISOString(),
                }
              : item
          )
        );

        logResult({
          id: upload.id,
          status: 'success',
          message: `Processed ${upload.originalFilename || 'capture'} • saved for gallery`,
          processedUrl,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        await markUpload(upload.id, 'failed', undefined, upload.imageIndex, message);

        setUploads((prev) =>
          prev.map((item) =>
            item.id === upload.id
              ? { ...item, status: 'failed', error: message }
              : item
          )
        );

        setResults((prev) => [
          {
            id: upload.id,
            status: 'failed',
            message: `Failed to process ${upload.originalFilename || 'capture'}: ${message}`,
          },
          ...prev,
        ]);
      }
    },
    [markUpload, stockNumber]
  );

  const processQueue = useCallback(async () => {
    if (processingRef.current) return;
    processingRef.current = true;
    setIsProcessing(true);

    for (const upload of pendingUploads) {
      await processUpload(upload);
    }

    processingRef.current = false;
    setIsProcessing(false);
    fetchUploads();
  }, [pendingUploads, processUpload, fetchUploads]);

  const handleFileDrop = useCallback(
    async (files: FileList) => {
      const incoming = Array.from(files);
      for (const file of incoming) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('stockNumber', stockNumber);

        const response = await fetch('/api/web-companion/uploads', {
          method: 'POST',
          body: formData,
        });

        const data = await response.json();
        if (data.success) {
          setUploads((prev) => [...prev, data.upload]);
        } else {
          setResults((prev) => [
            {
              id: crypto.randomUUID(),
              status: 'failed',
              message: data.error || 'Upload failed',
            },
            ...prev,
          ]);
        }
      }
    },
    [stockNumber]
  );

  useEffect(() => {
    fetchUploads();
    const interval = setInterval(() => fetchUploads(), 6000);
    return () => clearInterval(interval);
  }, [fetchUploads]);

  useEffect(() => {
    if (autoProcess && pendingUploads.length > 0 && !processingRef.current) {
      processQueue();
    }
  }, [autoProcess, pendingUploads, processQueue]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-10 space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <button
              onClick={() => router.push('/web-companion')}
              className="text-muted-foreground hover:text-foreground flex items-center gap-2 text-sm mb-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <h1 className="text-3xl font-semibold">
              Web Companion • <span className="text-primary">{stockNumber}</span>
            </h1>
            <p className="text-muted-foreground">
              Drop captures from iOS or upload manually. The browser will remove backgrounds and push assets into inventory.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              Pending: {pendingUploads.length}
            </Badge>
            <Badge variant="outline">
              Processed: {uploads.filter((u) => u.status === 'processed').length}
            </Badge>
            <Badge variant="outline">
              Failed: {uploads.filter((u) => u.status === 'failed').length}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2 bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-blue-300" />
                Incoming Captures
              </CardTitle>
              <CardDescription className="text-white/70">
                iOS should POST to <code className="text-white">/api/web-companion/uploads</code> with this stock number.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <DragAndDropUpload
                onFilesDrop={handleFileDrop}
                accept="image/*"
                isUploading={isLoading}
                uploadText="Drop captures here or tap to upload"
                uploadSubtext="Images are queued for background removal automatically"
              />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="autoProcess"
                    checked={autoProcess}
                    onChange={(e) => setAutoProcess(e.target.checked)}
                    className="rounded border-white/30 bg-white/10"
                  />
                  <label htmlFor="autoProcess" className="text-sm text-white/80">
                    Auto-run background removal when uploads arrive
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchUploads()}
                    className="border-white/30 text-white"
                  >
                    <RefreshCcw className="w-4 h-4 mr-1" />
                    Refresh queue
                  </Button>
                  <Button
                    size="sm"
                    onClick={processQueue}
                    disabled={isProcessing || pendingUploads.length === 0}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {isProcessing ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4 mr-2" />
                    )}
                    Process pending
                  </Button>
                </div>
              </div>

              <Separator className="bg-white/10" />

              <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                {isLoading && <p className="text-white/60 text-sm">Loading uploads…</p>}
                {!isLoading && uploads.length === 0 && (
                  <p className="text-white/60 text-sm">No uploads yet for this stock number.</p>
                )}

                {uploads.map((upload) => (
                  <div
                    key={upload.id}
                    className="flex items-center justify-between bg-white/5 border border-white/10 rounded-lg px-3 py-2"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {upload.originalFilename || 'Capture'}{' '}
                        <span className="text-white/50 text-xs">
                          · {upload.imageIndex !== undefined ? `#${upload.imageIndex}` : 'queued'}
                        </span>
                      </p>
                      <p className="text-xs text-white/60">
                        {new Date(upload.createdAt).toLocaleTimeString()} — {upload.originalUrl}
                      </p>
                      {upload.error && (
                        <p className="text-xs text-red-300 mt-1">Error: {upload.error}</p>
                      )}
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        upload.status === 'processed'
                          ? 'border-green-500/50 text-green-200 bg-green-500/10'
                          : upload.status === 'failed'
                          ? 'border-red-500/50 text-red-200 bg-red-500/10'
                          : 'border-yellow-500/50 text-yellow-200 bg-yellow-500/10'
                      }
                    >
                      {upload.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-blue-300" />
                  Latest Activity
                </CardTitle>
                <CardDescription className="text-white/70">
                  Background removal runs in-browser; processed images are saved to inventory with the original capture preserved.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 max-h-[260px] overflow-y-auto pr-1">
                {results.length === 0 && (
                  <p className="text-white/60 text-sm">No activity yet.</p>
                )}
                {results.map((result) => (
                  <div
                    key={result.id}
                    className="flex items-start gap-3 bg-white/5 border border-white/10 rounded-lg p-3"
                  >
                    {result.status === 'success' ? (
                      <CheckCircle className="w-5 h-5 text-green-300 mt-0.5" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-300 mt-0.5" />
                    )}
                    <div className="text-sm text-white/80">
                      <p>{result.message}</p>
                      {result.processedUrl && (
                        <a
                          href={result.processedUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-300 text-xs inline-flex items-center gap-1 mt-1"
                        >
                          View processed
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-lg">Send to Editor</CardTitle>
                <CardDescription className="text-white/70">
                  Opens Content Creation with this stock number pre-selected so the processed images are ready to design.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  onClick={() =>
                    router.push(`/content-creation?stockNumber=${encodeURIComponent(stockNumber)}`)
                  }
                >
                  Launch editor
                  <ExternalLink className="w-4 h-4 ml-2" />
                </Button>
                <p className="text-xs text-white/60">
                  Background-removed images are saved under <code>processed/{stockNumber}</code> in S3.
                  The first (original) capture URL is kept alongside each processed image entry.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
