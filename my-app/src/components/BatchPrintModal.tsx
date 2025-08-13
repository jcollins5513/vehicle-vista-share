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
      const allIds = vehicles.map(v => v.id);
      console.log('Selecting all vehicles:', allIds.length, 'vehicles');
      console.log('All IDs:', allIds);
      setSelectedVehicleIds(allIds);
    } else {
      console.log('Deselecting all vehicles');
      setSelectedVehicleIds([]);
    }
  };

  // Generate window sticker HTML for a vehicle
  const generateWindowStickerHTML = (vehicle: VehicleWithMedia) => {
    const vehicleTitle = `${vehicle.year} ${vehicle.make} ${vehicle.model} ${vehicle.trim || ''}`.trim();
    
    // Select only most important features for compact display and single-page fit
    const MAX_FEATURES = 18;
    const keyFeatures = (vehicle.features || []).slice(0, MAX_FEATURES);
    const chunkedFeatures = [] as string[][];
    const columns = 2;
    const perCol = Math.ceil(keyFeatures.length / columns) || 1;
    for (let i = 0; i < keyFeatures.length; i += perCol) {
      chunkedFeatures.push(keyFeatures.slice(i, i + perCol));
    }

    return `
      <html>
        <head>
          <title>${vehicleTitle} - Window Sticker</title>
          <style>
            /* Reset and override all browser defaults */
            html, body, div, span, h1, h2, h3, h4, h5, h6, p {
              margin: 0;
              padding: 0;
            }

            @page {
              margin: 0.5in;
              size: letter;
              /* Remove headers and footers */
              @top-left { content: none; }
              @top-center { content: none; }
              @top-right { content: none; }
              @bottom-left { content: none; }
              @bottom-center { content: none; }
              @bottom-right { content: none; }
              @top-left-corner { content: none; }
              @top-right-corner { content: none; }
              @bottom-left-corner { content: none; }
              @bottom-right-corner { content: none; }
            }
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            
            body {
              font-family: Arial, sans-serif;
              padding: 20px;
              background: white;
              color: black;
              line-height: 1.3;
              max-width: 8.5in;
              margin: 0 auto;
            }

            /* Constrain to single printable page (10in after 0.5in margins) */
            .page {
              height: 10in;
              overflow: hidden;
              display: flex;
              flex-direction: column;
            }

            .header {
              display: flex;
              align-items: center;
              margin-bottom: 25px;
              border-bottom: 3px solid #000;
              padding-bottom: 15px;
              page-break-inside: avoid;
            }

            .header img {
              width: 220px;
              height: auto;
              margin-right: 30px;
            }

            .header-text {
              flex: 1;
            }

            .vehicle-title {
              font-size: 24px;
              font-weight: bold;
              margin: 0 0 8px 0;
              color: #000;
            }

            .stock-info {
              font-size: 16px;
              margin: 3px 0;
              color: #333;
            }

            .content-grid {
              display: grid;
              grid-template-columns: 2fr 1fr;
              gap: 30px;
              margin-bottom: 20px;
              page-break-inside: avoid;
            }

            .basic-info {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 12px;
              font-size: 14px;
              margin-bottom: 25px;
            }

            .basic-info div {
              display: flex;
              justify-content: space-between;
              border-bottom: 1px dotted #666;
              padding-bottom: 4px;
            }

            .basic-info div span:first-child {
              font-weight: bold;
            }

            .features-section { margin-bottom: 20px; }

            .features-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 15px;
              max-height: 4in;
              overflow: hidden;
            }

            .feature-column ul {
              list-style: disc;
              margin-left: 20px;
              font-size: 12px;
            }

            .feature-column li {
              margin-bottom: 3px;
            }

            .features-title {
              font-size: 16px;
              font-weight: bold;
              margin-bottom: 12px;
              text-decoration: underline;
              color: #000;
            }

            .qr-section {
              display: flex;
              flex-direction: column;
              align-items: center;
            }

            .qr-codes {
              display: flex;
              gap: 20px;
              margin-bottom: 15px;
            }

            .qr-code {
              text-align: center;
            }

            .qr-code svg {
              width: 100px !important;
              height: 100px !important;
            }

            .qr-label {
              margin-top: 5px;
              font-weight: bold;
              font-size: 12px;
            }

            .price-section {
              text-align: center;
              margin: 30px 0 20px 0;
              padding: 20px;
              border: 3px solid #000;
              background: #f5f5f5;
              page-break-inside: avoid;
            }

            .price-label {
              font-size: 18px;
              font-weight: bold;
              margin-bottom: 10px;
              color: #000;
            }

            .price-value {
              font-size: 36px;
              font-weight: bold;
              color: #d4af37;
              text-shadow: 1px 1px 2px rgba(0,0,0,0.3);
            }

            .disclaimer {
              font-size: 8px;
              margin-top: 20px;
              border-top: 1px solid #ccc;
              padding-top: 10px;
              text-align: justify;
              line-height: 1.2;
              max-height: 1.2in;
              overflow: hidden;
              page-break-inside: avoid;
            }
            
            @media print {
              /* Force remove all page headers and footers */
              @page {
                margin: 0.5in 0.5in 0.5in 0.5in;
                size: letter;

                /* Explicitly remove all header/footer content */
                @top-left { content: ""; display: none; }
                @top-center { content: ""; display: none; }
                @top-right { content: ""; display: none; }
                @bottom-left { content: ""; display: none; }
                @bottom-center { content: ""; display: none; }
                @bottom-right { content: ""; display: none; }
                @top-left-corner { content: ""; display: none; }
                @top-right-corner { content: ""; display: none; }
                @bottom-left-corner { content: ""; display: none; }
                @bottom-right-corner { content: ""; display: none; }
              }

              /* Override browser print defaults */
              html {
                -webkit-print-color-adjust: exact !important;
                color-adjust: exact !important;
                print-color-adjust: exact !important;
              }

              body {
                padding: 0;
                max-width: none;
                min-height: auto;
                -webkit-print-color-adjust: exact !important;
                color-adjust: exact !important;
                print-color-adjust: exact !important;
              }

              /* Hide any potential timestamp elements */
              .timestamp, .print-date, .print-time,
              [class*="timestamp"], [class*="date"], [class*="time"] {
                display: none !important;
                visibility: hidden !important;
              }

              .header img { width: 200px; }

              .vehicle-title { font-size: 20px; }

              .qr-code svg {
                width: 85px !important;
                height: 85px !important;
              }

              .price-value { font-size: 30px; }

              .disclaimer { font-size: 7px; }
            }
          </style>
        </head>
        <body>
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
                <div><span>Color:</span><span>${vehicle.color}</span></div>
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
                  <div class="qr-label">Vehicle Details</div>
                </div>
                <div class="qr-code">
                  <div class="qr-label">CARFAX Report</div>
                </div>
              </div>
            </div>
          </div>

          <div class="price-section">
            <div class="price-label">ASKING PRICE</div>
            <div class="price-value">$${vehicle.price?.toLocaleString() || 'Contact for Price'}</div>
          </div>

          <div class="disclaimer">
            It is your responsibility to address any and all differences between information on this label and the actual vehicle specifications and/or any warranties offered prior to the sale of this vehicle. Vehicle data on this label is compiled from publicly available sources believed by the Publisher to be reliable. Vehicle data may change without notice. The Publisher assumes no responsibility for errors and/or omissions in this data, the compilation of this data or sticker placement, and makes no representations express or implied to any actual or prospective purchaser of the vehicle as to the condition of the vehicle, vehicle specifications, ownership, vehicle history, equipment/accessories, price or warranties. Actual mileage may vary.
          </div>
          </div>

          <script>
            window.onload = () => {
              window.print();
            };
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
        // Store all print windows to prevent garbage collection
        const printWindows: Window[] = [];
        
        // First, open all windows and write HTML content
        for (let i = 0; i < selectedVehiclesList.length; i++) {
          const vehicle = selectedVehiclesList[i];
          setProgress({ current: i + 1, total: selectedVehiclesList.length });
          
          const html = generateWindowStickerHTML(vehicle);
          const printWindow = window.open('', '_blank');
          if (printWindow) {
            printWindow.document.write(html);
            printWindow.document.close(); // Important: close the document to finish loading
            printWindows.push(printWindow);
          }
          
          // Small delay between opening windows to prevent browser blocking
          await new Promise(resolve => setTimeout(resolve, 300));
        }
        
        // Wait a bit to ensure all windows have loaded their content
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Now trigger print for each window
        for (const printWindow of printWindows) {
          try {
            printWindow.print();
          } catch (e) {
            console.error('Error printing window:', e);
          }
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
            {selectedVehicleIds.length} of {vehicles.length} vehicles selected
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
        
        <ScrollArea className="h-[300px] border border-white/10 rounded-md p-2">
          <div className="space-y-2">
            {vehicles.map((vehicle) => (
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
              </div>
            ))}
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
