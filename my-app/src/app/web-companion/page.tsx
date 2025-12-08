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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 text-white">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto space-y-8">
          <div>
            <p className="text-blue-300 text-sm uppercase tracking-wide mb-2">Inventory Sync</p>
            <h1 className="text-4xl md:text-5xl font-bold leading-tight">
              Web Companion
              <span className="block text-lg text-white/70 font-normal mt-2">
                Start a capture session by stock number and mirror iOS uploads straight into the browser.
              </span>
            </h1>
          </div>

          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <Link2 className="w-5 h-5 text-blue-300" />
                Create a Session
              </CardTitle>
              <CardDescription className="text-white/70">
                Enter a stock number to open the live web companion workspace. Use this same stock number when sending captures from the iOS app.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                <div className="md:col-span-4 space-y-2">
                  <Label htmlFor="stockNumber" className="text-white">Stock Number</Label>
                  <Input
                    id="stockNumber"
                    value={stockNumber}
                    onChange={(e) => setStockNumber(e.target.value.toUpperCase())}
                    placeholder="e.g. 23-8842"
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
                  />
                </div>
                <Button
                  onClick={startSession}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  disabled={!stockNumber.trim()}
                >
                  Continue
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-blue-300" />
                iOS Upload Endpoint
              </CardTitle>
              <CardDescription className="text-white/70">
                Point the AutoCapture app at this endpoint to drop captures into the queue. Background removal runs in the browser session.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-white/80">
              <div className="bg-black/40 rounded-lg p-4 border border-white/10 font-mono text-xs overflow-x-auto">
                <div>POST /api/web-companion/uploads</div>
                <div className="mt-2 text-white/60">multipart/form-data fields:</div>
                <div>• stockNumber — required</div>
                <div>• file — required image payload</div>
              </div>
              <p className="text-white/60">
                The web workspace will poll this queue and push processed images into inventory so they appear inside the Content Creation editor.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
