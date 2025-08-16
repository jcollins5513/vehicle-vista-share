'use client';

import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { VehicleWithMedia } from '@/types';
import { PrinterIcon, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { generateBuyersGuidePDF, createPDFBlobUrl } from '@/lib/pdf-service';

interface WindowStickerProps {
  vehicle: VehicleWithMedia;
}

const WindowSticker = ({ vehicle }: WindowStickerProps) => {
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  
  const getCarfaxUrl = (vin: string) => 
    `https://www.carfax.com/VehicleHistory/p/Report.cfx?partner=DVW_1&vin=${vin}`;
    
  const openBuyersGuidePDF = async () => {
    try {
      setIsGeneratingPDF(true);
      
      // Generate the PDF with vehicle-specific information
      const pdfBytes = await generateBuyersGuidePDF(vehicle);
      
      // Create a blob URL for the PDF
      const pdfUrl = createPDFBlobUrl(pdfBytes);
      
      // Open the PDF in a new tab
      window.open(pdfUrl, '_blank');
      
      // Clean up the blob URL after a delay to ensure it's loaded
      setTimeout(() => {
        URL.revokeObjectURL(pdfUrl);
      }, 5000);
    } catch (error) {
      console.error('Error generating Buyers Guide PDF:', error);
      alert('Failed to generate Buyers Guide PDF. Please try again.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handlePrintWindowSticker = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const sourceQrCode = document.getElementById(`window-source-qr-${vehicle.stockNumber}`)?.querySelector('svg')?.outerHTML;
    const carfaxQrCode = document.getElementById(`window-carfax-qr-${vehicle.stockNumber}`)?.querySelector('svg')?.outerHTML;
    const vehicleTitle = `${vehicle.year} ${vehicle.make} ${vehicle.model} ${vehicle.trim || ''}`.trim();

    // Select only most important features for compact display
    const allFeatures = vehicle.features || [];
    // Cap features to guarantee single-page fit
    const MAX_FEATURES = 35;
    const selectedFeatures = allFeatures.slice(0, MAX_FEATURES);
    const chunkedFeatures = [];
    const columns = 2;
    const perCol = Math.ceil(selectedFeatures.length / columns) || 1;
    for (let i = 0; i < selectedFeatures.length; i += perCol) {
      chunkedFeatures.push(selectedFeatures.slice(i, i + perCol));
    }
    const vehicleColor = vehicle.color || (vehicle as any).exteriorColor || 'N/A';

    printWindow.document.write(`
      <html>
        <head>
          <title> </title>
          <meta name="description" content="">
          <meta name="author" content="">
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

            /* Constrain to single printable page (10in after 0.5in page margins) */
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

            .features-section {
              margin-bottom: 20px;
            }

            .features-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 15px;
              max-height: 5in;
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
              flex-direction: column;
              align-items: center;
              gap: 20px;
              margin-bottom: 20px;
            }

            .qr-code {
              text-align: center;
            }

            .qr-code svg {
              width: 110px !important;
              height: 110px !important;
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
                width: 95px !important;
                height: 95px !important;
              }

              .price-value { font-size: 30px; }

              .disclaimer { font-size: 7px; }
            }
          </style>
        </head>
        <body>
          <div class="page">
          <div class="header">
            <img src="/Bentley-logo-groups.svg" alt="Bentley Logo" />
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

              ${selectedFeatures.length > 0 ? `
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
                  ${sourceQrCode}
                  <div class="qr-label">Vehicle Details</div>
                </div>
                <div class="qr-code">
                  ${carfaxQrCode}
                  <div class="qr-label">CARFAX Report</div>
                </div>
              </div>
            </div>
          </div>

          <div class="price-section">
            <div class="price-label">SALE PRICE</div>
            <div class="price-value">
              ${(() => {
                const pd = (vehicle.pricingDetails || {});
                const sale = pd['Sale Price'] || pd['Sale price'] || pd['SALE PRICE'] || pd['SalePrice'];
                if (sale) return sale;
                if (vehicle.salePrice) return typeof vehicle.salePrice === 'number' ? `$${vehicle.salePrice.toLocaleString()}` : vehicle.salePrice;
                if (vehicle.price && vehicle.price > 0) return `$${vehicle.price.toLocaleString()}`;
                return 'Contact for Price';
              })()}
            </div>
          </div>

          <div class="disclaimer">
            It is your responsibility to address any and all differences between information on this label and the actual vehicle specifications and/or any warranties offered prior to the sale of this vehicle. Vehicle data on this label is compiled from publicly available sources believed by the Publisher to be reliable. Vehicle data may change without notice. The Publisher assumes no responsibility for errors and/or omissions in this data, the compilation of this data or sticker placement, and makes no representations express or implied to any actual or prospective purchaser of the vehicle as to the condition of the vehicle, vehicle specifications, ownership, vehicle history, equipment/accessories, price or warranties. Actual mileage may vary.
          </div>
          </div>

          <script>
            window.onload = () => {
              // Clear document title to prevent it showing in headers
              document.title = '';

              // Show instruction alert before printing
              if (confirm('To print without timestamp, please:\\n\\n1. Click "More settings" in the print dialog\\n2. Uncheck "Headers and footers"\\n3. Then click Print\\n\\nClick OK to open print dialog')) {
                window.print();
              }
            };
          </script>
        </body>
      </html>
    `);
  };

  return (
    <div className="space-y-4">
      {/* Hidden QR codes for printing */}
      <div className="hidden">
        <div id={`window-source-qr-${vehicle.stockNumber}`}>
          <QRCodeSVG
            value={vehicle.sourceUrl || `${window.location.origin}/customer/${vehicle.id}`}
            size={120}
            level="H"
            includeMargin={true}
          />
        </div>
        <div id={`window-carfax-qr-${vehicle.stockNumber}`}>
          <QRCodeSVG
            value={getCarfaxUrl(vehicle.vin)}
            size={120}
            level="H"
            includeMargin={true}
          />
        </div>
      </div>

      {/* Print options with popover */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            <PrinterIcon className="w-4 h-4 mr-2" />
            Print Window Sticker
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-2 bg-slate-800 border border-white/20 text-white">
          <div className="flex flex-col space-y-2">
            <Button
              onClick={handlePrintWindowSticker}
              className="flex items-center justify-start px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded"
            >
              <PrinterIcon className="w-4 h-4 mr-2" />
              Custom Window Sticker
            </Button>
            <Button
              onClick={openBuyersGuidePDF}
              disabled={isGeneratingPDF}
              className="flex items-center justify-start px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded"
            >
              {isGeneratingPDF ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <FileText className="w-4 h-4 mr-2" />
              )}
              {isGeneratingPDF ? 'Generating...' : 'Buyers Guide PDF'}
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default WindowSticker;
