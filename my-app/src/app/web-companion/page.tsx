'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowRight, Link2, Smartphone } from 'lucide-react';

export default function WebCompanionLanding() {
  const [stockNumber, setStockNumber] = useState('');
  const router = useRouter();

  const startSession = () => {
    const trimmed = stockNumber.trim();
    if (!trimmed) return;
    router.push(`/web-companion/${encodeURIComponent(trimmed)}`);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto space-y-8">
          <div>
            <p className="text-primary text-sm uppercase tracking-wide mb-2">Inventory Sync</p>
            <h1 className="text-4xl md:text-5xl font-bold leading-tight">
              Web Companion
              <span className="block text-lg text-muted-foreground font-normal mt-2">
                Start a capture session by stock number and mirror iOS uploads straight into the browser.
              </span>
            </h1>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <Link2 className="w-5 h-5 text-primary" />
                Create a Session
              </CardTitle>
              <CardDescription>
                Enter a stock number to open the live web companion workspace. Use this same stock number when sending captures from the iOS app.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                <div className="md:col-span-4 space-y-2">
                  <Label htmlFor="stockNumber">Stock Number</Label>
                  <Input
                    id="stockNumber"
                    value={stockNumber}
                    onChange={(e) => setStockNumber(e.target.value.toUpperCase())}
                    placeholder="e.g. 23-8842"
                  />
                </div>
                <Button
                  onClick={startSession}
                  className="w-full"
                  disabled={!stockNumber.trim()}
                >
                  Continue
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-primary" />
                iOS Upload Endpoint
              </CardTitle>
              <CardDescription>
                Point the AutoCapture app at this endpoint to drop captures into the queue. Background removal runs in the browser session.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="rounded-lg p-4 border border-border bg-card font-mono text-xs overflow-x-auto">
                <div>POST /api/web-companion/uploads</div>
                <div className="mt-2 text-muted-foreground">multipart/form-data fields:</div>
                <div>• stockNumber — required</div>
                <div>• file — required image payload</div>
              </div>
              <p className="text-muted-foreground">
                The web workspace will poll this queue and push processed images into inventory so they appear inside the Content Creation editor.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
