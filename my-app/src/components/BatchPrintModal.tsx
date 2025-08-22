'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, PrinterIcon, FileText } from 'lucide-react';
import { VehicleWithMedia } from '@/types';
import { generateBuyersGuidePDF, createPDFBlobUrl } from '@/lib/pdf-service';

interface BatchPrintModalProps {
  vehicles: VehicleWithMedia[];
  isOpen: boolean;
  onClose: () => void;
}

export default function BatchPrintModal({ vehicles, isOpen, onClose }: BatchPrintModalProps) {
  // Using an array instead of a Set for better React state management
  const [selectedVehicleIds, setSelectedVehicleIds] = useState<string[]>([]);
  const [printType, setPrintType] = useState<'window-sticker' | 'buyers-guide'>('window-sticker');
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [searchTerm, setSearchTerm] = useState('');

  // Toggle selection of a vehicle
  const toggleVehicleSelection = (vehicleId: string) => {
    setSelectedVehicleIds(prev => {
      const isSelected = prev.includes(vehicleId);
      const newSelection = isSelected 
        ? prev.filter(id => id !== vehicleId)
        : [...prev, vehicleId];
      
      console.log('Vehicle toggled:', vehicleId, 'Selected:', !isSelected);
      console.log('New selection size:', newSelection.length);
      console.log('Selection contents:', newSelection);
      
      return newSelection;
    });
  };

  // Select or deselect all vehicles
  const toggleSelectAll = (select: boolean) => {
    if (select) {
      const allIds = filteredVehicles.map(v => v.id);
      console.log('Selecting all filtered vehicles:', allIds.length, 'vehicles');
      console.log('All IDs:', allIds);
      setSelectedVehicleIds(allIds);
    } else {
      console.log('Deselecting all vehicles');
      setSelectedVehicleIds([]);
    }
  };

  const getCarfaxUrl = (vin: string) => 
    `https://www.carfax.com/VehicleHistory/p/Report.cfx?partner=DVW_1&vin=${vin}`;

  // Generate a simple QR code SVG string
  const generateQRCodeSVG = (value: string): string => {
    // Create a simple text-based representation for now
    // In a production environment, you'd want to use a proper QR code library
    const displayText = value.length > 30 ? value.substring(0, 30) + '...' : value;
    
    return `<svg width="140" height="140" viewBox="0 0 140 140" xmlns="http://www.w3.org/2000/svg">
      <rect width="140" height="140" fill="white" stroke="black" stroke-width="2"/>
      <rect x="10" y="10" width="120" height="120" fill="none" stroke="black" stroke-width="1"/>
      <text x="70" y="50" text-anchor="middle" font-family="Arial" font-size="8" fill="black">QR Code</text>
      <text x="70" y="70" text-anchor="middle" font-family="Arial" font-size="6" fill="black">${displayText}</text>
      <text x="70" y="90" text-anchor="middle" font-family="Arial" font-size="6" fill="black">Scan to view</text>
    </svg>`;
  };

  // Filter vehicles based on search term
  const filteredVehicles = vehicles.filter(
    (vehicle) =>
      vehicle.make.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicle.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicle.year.toString().includes(searchTerm) ||
      vehicle.stockNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicle.vin?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Removed obsolete per-vehicle single-window template

  // Generate a single print window that contains multiple one-page stickers
  const generateBatchWindowStickersHTML = (vehiclesToPrint: VehicleWithMedia[]) => {
    // Build per-vehicle pages
    const pages = vehiclesToPrint.map((vehicle) => {
      const vehicleTitle = `${vehicle.year} ${vehicle.make} ${vehicle.model} ${vehicle.trim || ''}`.trim();
      const vehicleColor = (vehicle as any).color || (vehicle as any).exteriorColor || 'N/A';

      // Generate QR codes directly instead of extracting from DOM
      const sourceSvg = generateQRCodeSVG(vehicle.sourceUrl || `${window.location.origin}/customer/${vehicle.id}`);
      const carfaxSvg = generateQRCodeSVG(getCarfaxUrl(vehicle.vin));

      const MAX_FEATURES = 35;
      const keyFeatures = (vehicle.features || []).slice(0, MAX_FEATURES);
      const columns = 2;
      const perCol = Math.ceil(keyFeatures.length / columns) || 1;
      const chunkedFeatures: string[][] = [];
      for (let i = 0; i < keyFeatures.length; i += perCol) {
        chunkedFeatures.push(keyFeatures.slice(i, i + perCol));
      }

      const priceHtml = (() => {
        const pd = (vehicle.pricingDetails || {} as Record<string, string>);
        const sale = pd['Sale Price'] || pd['Sale price'] || pd['SALE PRICE'] || pd['SalePrice'];
        if (sale) return sale;
        const sp: any = (vehicle as any).salePrice;
        if (sp) return typeof sp === 'number' ? `$${sp.toLocaleString()}` : sp;
        const price: any = (vehicle as any).price;
        if (price && price > 0) return `$${price.toLocaleString()}`;
        return 'Contact for Price';
      })();

      return `
        <div class="page">
          <div class="header">
            <img src="${window.location.origin}/Bentley-logo-groups.svg" alt="Bentley Logo" />
            <div class="header-text">
              <div class="vehicle-title">${vehicleTitle}</div>
              <div class="stock-info">Stock #: ${vehicle.stockNumber}</div>
              <div class="stock-info">VIN: ${vehicle.vin}</div>
            </div>
          </div>

          <div class="content-grid">
            <div class="left-column">
              <div class="basic-info">
                <div><span>Odometer:</span><span>${vehicle.mileage?.toLocaleString() || 'N/A'}</span></div>
                <div><span>Engine:</span><span>${vehicle.engine || 'N/A'}</span></div>
                <div><span>Color:</span><span>${vehicleColor}</span></div>
                <div><span>Transmission:</span><span>${vehicle.transmission || 'N/A'}</span></div>
              </div>

              ${keyFeatures.length > 0 ? `
                <div class="features-section">
                  <div class="features-title">Key Features</div>
                  <div class="features-grid">
                    ${chunkedFeatures.map(chunk => `
                      <div class="feature-column">
                        <ul>
                          ${chunk.map(f => `<li>${f}</li>`).join('')}
                        </ul>
                      </div>
                    `).join('')}
                  </div>
                </div>
              ` : ''}
            </div>

            <div class="qr-section">
            <div class="qr-codes">
                <div class="qr-code">
                  ${sourceSvg}
                  <div class="qr-label">Vehicle Details</div>
                </div>
                <div class="qr-code">
                  ${carfaxSvg}
                  <div class="qr-label">CARFAX Report</div>
                </div>
              </div>
            </div>
          </div>

          <div class="price-section">
            <div class="price-label">SALE PRICE</div>
            <div class="price-value">${priceHtml}</div>
          </div>

          <div class="disclaimer">
            It is your responsibility to address any and all differences between information on this label and the actual vehicle specifications and/or any warranties offered prior to the sale of this vehicle. Vehicle data on this label is compiled from publicly available sources believed by the Publisher to be reliable. Vehicle data may change without notice. The Publisher assumes no responsibility for errors and/or omissions in this data, the compilation of this data or sticker placement, and makes no representations express or implied to any actual or prospective purchaser of the vehicle as to the condition of the vehicle, vehicle specifications, ownership, vehicle history, equipment/accessories, price or warranties. Actual mileage may vary.
          </div>
        </div>
      `;
    }).join('\n');

    // One aggregated document with one style and many pages
    return `
      <html>
        <head>
          <title>Window Stickers</title>
          <style>
            html, body { margin: 0; padding: 0; }
            @page { margin: 0.5in; size: letter; }
            * { box-sizing: border-box; }
            body {
              font-family: Arial, sans-serif;
              background: white;
              color: black;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .page {
              height: 10in;
              overflow: hidden;
              display: flex;
              flex-direction: column;
              break-inside: avoid;
              page-break-inside: avoid;
            }
            @media print {
              .page { break-after: page; }
              .page:last-child { break-after: auto; }
            }
            .header { display: flex; align-items: center; margin-bottom: 25px; border-bottom: 3px solid #000; padding-bottom: 15px; }
            .header img { width: 220px; height: auto; margin-right: 30px; }
            .vehicle-title { font-size: 24px; font-weight: bold; margin: 0 0 8px 0; color: #000; }
            .stock-info { font-size: 16px; margin: 3px 0; color: #333; }
            .content-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 30px; margin-bottom: 20px; }
            .basic-info { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 14px; margin-bottom: 25px; }
            .basic-info div { display: flex; justify-content: space-between; border-bottom: 1px dotted #666; padding-bottom: 4px; }
            .basic-info div span:first-child { font-weight: bold; }
            .features-section { margin-bottom: 20px; }
            .features-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; max-height: 5in; overflow: hidden; }
            .feature-column ul { list-style: disc; margin-left: 20px; font-size: 12px; }
            .feature-column li { margin-bottom: 3px; }
            .qr-section { display: flex; flex-direction: column; align-items: center; }
            .qr-codes { display: flex; flex-direction: column; align-items: center; gap: 20px; margin-bottom: 20px; }
            .qr-code svg { width: 110px !important; height: 110px !important; }
            .qr-label { margin-top: 5px; font-weight: bold; font-size: 12px; }
            .price-section { text-align: center; margin: 30px 0 20px 0; padding: 20px; border: 3px solid #000; background: #f5f5f5; }
            .price-label { font-size: 18px; font-weight: bold; margin-bottom: 10px; color: #000; }
            .price-value { font-size: 36px; font-weight: bold; color: #d4af37; text-shadow: 1px 1px 2px rgba(0,0,0,0.3); }
            .disclaimer { font-size: 8px; margin-top: 20px; border-top: 1px solid #ccc; padding-top: 10px; text-align: justify; line-height: 1.2; max-height: 1.2in; overflow: hidden; }
          </style>
        </head>
        <body>
          ${pages}
          <script>
            window.onload = () => { window.print(); };
          </script>
        </body>
      </html>
    `;
  };

  // Handle batch printing
  const handleBatchPrint = async () => {
    if (selectedVehicleIds.length === 0) return;
    
    console.log('Starting batch print with', selectedVehicleIds.length, 'vehicles selected');
    console.log('Selected vehicle IDs:', selectedVehicleIds);
    
    setIsGenerating(true);
    setProgress({ current: 0, total: selectedVehicleIds.length });
    
    try {
      const selectedVehiclesList = vehicles.filter(v => selectedVehicleIds.includes(v.id));
      console.log('Filtered vehicle list length:', selectedVehiclesList.length);
      console.log('First few vehicles:', selectedVehiclesList.slice(0, 3).map(v => ({ id: v.id, make: v.make, model: v.model })));
      
      if (printType === 'window-sticker') {
        // Open a single print window with multiple one-page stickers
        const html = generateBatchWindowStickersHTML(selectedVehiclesList);
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(html);
          printWindow.document.close();
        }
      } else {
        // Store all PDF URLs to prevent garbage collection
        const pdfUrls: string[] = [];
        
        // First, generate all PDFs
        for (let i = 0; i < selectedVehiclesList.length; i++) {
          const vehicle = selectedVehiclesList[i];
          setProgress({ current: i + 1, total: selectedVehiclesList.length });
          
          const pdfBytes = await generateBuyersGuidePDF(vehicle);
          const pdfUrl = createPDFBlobUrl(pdfBytes);
          pdfUrls.push(pdfUrl);
        }
        
        // Then open all PDFs in new tabs
        for (const url of pdfUrls) {
          window.open(url, '_blank');
          // Small delay between opening tabs to prevent browser blocking
          await new Promise(resolve => setTimeout(resolve, 300));
        }
        
        // Clean up the blob URLs after a delay
        setTimeout(() => {
          for (const url of pdfUrls) {
            URL.revokeObjectURL(url);
          }
        }, 5000);
      }
    } catch (error) {
      console.error('Error during batch printing:', error);
      alert('An error occurred during batch printing. Please try again.');
    } finally {
      setIsGenerating(false);
      setProgress({ current: 0, total: 0 });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] bg-slate-900 text-white border border-white/20">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Batch Print</DialogTitle>
          <DialogDescription className="text-white/70">
            Select vehicles and print type to generate multiple documents at once.
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="window-sticker" onValueChange={(value) => setPrintType(value as any)}>
          <TabsList className="grid grid-cols-2 mb-4">
            <TabsTrigger value="window-sticker" className="data-[state=active]:bg-blue-600">
              <PrinterIcon className="w-4 h-4 mr-2" />
              Window Stickers
            </TabsTrigger>
            <TabsTrigger value="buyers-guide" className="data-[state=active]:bg-blue-600">
              <FileText className="w-4 h-4 mr-2" />
              Buyers Guides
            </TabsTrigger>
          </TabsList>
        </Tabs>
        
        <div className="flex justify-between items-center mb-2">
          <div className="text-sm text-white/70">
            {selectedVehicleIds.length} of {filteredVehicles.length} vehicles selected
          </div>
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => toggleSelectAll(true)}
              className="text-xs h-8"
            >
              Select All
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => toggleSelectAll(false)}
              className="text-xs h-8"
            >
              Deselect All
            </Button>
          </div>
        </div>
        
        {/* Search Input */}
        <div className="relative mb-3">
          <input
            type="text"
            placeholder="Search by make, model, year, stock #, or VIN..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <ScrollArea className="h-[300px] border border-white/10 rounded-md p-2">
          <div className="space-y-2">
            {filteredVehicles.length === 0 ? (
              <div className="text-center py-8 text-white/50">
                <div className="text-lg mb-2">No vehicles found</div>
                <div className="text-sm">Try adjusting your search terms</div>
              </div>
            ) : (
              filteredVehicles.map((vehicle) => (
                <div 
                  key={vehicle.id} 
                  className="flex items-center space-x-3 p-2 hover:bg-white/5 rounded-md"
                >
                  <Checkbox 
                    id={`vehicle-${vehicle.id}`} 
                    checked={selectedVehicleIds.includes(vehicle.id)}
                    onCheckedChange={() => toggleVehicleSelection(vehicle.id)}
                    onClick={(e) => e.stopPropagation()} // Prevent event bubbling
                  />
                  <Label 
                    htmlFor={`vehicle-${vehicle.id}`}
                    className="flex-1 cursor-pointer"
                  >
                    <div className="font-medium">
                      {vehicle.year} {vehicle.make} {vehicle.model}
                    </div>
                    <div className="text-sm text-white/70">
                      Stock #{vehicle.stockNumber} | VIN: {vehicle.vin}
                    </div>
                  </Label>
                  {/* QR codes are now generated directly in the print function */}
                </div>
              ))
            )}
          </div>
        </ScrollArea>
        
        {isGenerating && (
          <div className="flex flex-col items-center justify-center py-2">
            <Loader2 className="w-6 h-6 animate-spin text-blue-400 mb-2" />
            <div className="text-sm text-white/70">
              Generating {progress.current} of {progress.total}...
            </div>
          </div>
        )}
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isGenerating}>
            Cancel
          </Button>
          <Button 
            onClick={handleBatchPrint} 
            disabled={selectedVehicleIds.length === 0 || isGenerating}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <PrinterIcon className="w-4 h-4 mr-2" />
                Print {selectedVehicleIds.length} {printType === 'window-sticker' ? 'Window Stickers' : 'Buyers Guides'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
