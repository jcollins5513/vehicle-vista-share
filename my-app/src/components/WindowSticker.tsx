'use client';

import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { VehicleWithMedia } from '@/types';
import { PrinterIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface WindowStickerProps {
  vehicle: VehicleWithMedia;
}

const WindowSticker = ({ vehicle }: WindowStickerProps) => {
  const getCarfaxUrl = (vin: string) => 
    `https://www.carfax.com/VehicleHistory/p/Report.cfx?partner=DVW_1&vin=${vin}`;

  const handlePrintWindowSticker = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const sourceQrCode = document.getElementById(`window-source-qr-${vehicle.stockNumber}`)?.querySelector('svg')?.outerHTML;
    const carfaxQrCode = document.getElementById(`window-carfax-qr-${vehicle.stockNumber}`)?.querySelector('svg')?.outerHTML;
    const vehicleTitle = `${vehicle.year} ${vehicle.make} ${vehicle.model} ${vehicle.trim || ''}`.trim();

    // Select only most important features for compact display
    const keyFeatures = vehicle.features?.slice(0, 12) || [];
    const chunkedFeatures = [];
    for (let i = 0; i < keyFeatures.length; i += 6) {
      chunkedFeatures.push(keyFeatures.slice(i, i + 6));
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>Window Sticker - ${vehicle.stockNumber}</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            
            body {
              font-family: Arial, sans-serif;
              padding: 15px;
              background: white;
              color: black;
              line-height: 1.2;
              max-width: 8.5in;
              margin: 0 auto;
            }

            .header {
              display: flex;
              align-items: center;
              margin-bottom: 15px;
              border-bottom: 2px solid #000;
              padding-bottom: 10px;
            }

            .header img {
              width: 200px;
              height: auto;
              margin-right: 20px;
            }

            .header-text {
              flex: 1;
            }

            .vehicle-title {
              font-size: 18px;
              font-weight: bold;
              margin: 0 0 5px 0;
            }

            .stock-info {
              font-size: 14px;
              margin: 0;
            }

            .content-grid {
              display: grid;
              grid-template-columns: 2fr 1fr;
              gap: 20px;
              margin-bottom: 15px;
            }

            .basic-info {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 8px;
              font-size: 12px;
              margin-bottom: 15px;
            }

            .basic-info div {
              display: flex;
              justify-content: space-between;
              border-bottom: 1px dotted #ccc;
              padding-bottom: 2px;
            }

            .features-section {
              margin-bottom: 15px;
            }

            .features-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 10px;
            }

            .feature-column ul {
              list-style: disc;
              margin-left: 15px;
              font-size: 10px;
            }

            .feature-column li {
              margin-bottom: 1px;
            }

            .features-title {
              font-size: 14px;
              font-weight: bold;
              margin-bottom: 8px;
              text-decoration: underline;
            }

            .qr-section {
              display: flex;
              flex-direction: column;
              align-items: center;
            }

            .qr-codes {
              display: flex;
              gap: 15px;
              margin-bottom: 10px;
            }

            .qr-code {
              text-align: center;
            }

            .qr-code svg {
              width: 80px !important;
              height: 80px !important;
            }

            .qr-label {
              margin-top: 3px;
              font-weight: bold;
              font-size: 10px;
            }

            .disclaimer {
              font-size: 7px;
              margin-top: 10px;
              border-top: 1px solid #ccc;
              padding-top: 8px;
              text-align: justify;
            }
            
            @media print {
              body {
                padding: 0;
              }
              
              .qr-code svg {
                width: 100px !important;
                height: 100px !important;
              }
              
              @page {
                margin: 10mm;
                size: auto;
              }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <img src="https://cdn.builder.io/api/v1/image/assets%2F0f7830926b04438e96198e445d7c6df8%2F2e0eb47e66704c669bf4794845b398f2?format=webp&width=800" alt="Bentley Supercenter Logo" />
            <div class="vehicle-title">${vehicleTitle}</div>
            <div>Stock #: ${vehicle.stockNumber}</div>
          </div>
          
          <div class="basic-info">
            <div><span>Odometer:</span><span>${vehicle.mileage?.toLocaleString() || 'N/A'}</span></div>
            <div><span>Transmission:</span><span>${vehicle.transmission || 'N/A'}</span></div>
            <div><span>Engine:</span><span>${vehicle.engine || 'N/A'}</span></div>
            <div><span>VIN:</span><span>${vehicle.vin}</span></div>
            <div><span>Color:</span><span>${vehicle.color}</span></div>
            <div><span>Stock #:</span><span>${vehicle.stockNumber}</span></div>
            <div><span>Interior:</span><span>Premium</span></div>
            <div><span>Drivetrain:</span><span>N/A</span></div>
          </div>
          
          <div class="features-grid">
            ${technicalFeatures.length > 0 ? `
              <div class="feature-category">
                <h3>Technical</h3>
                <ul>
                  ${technicalFeatures.map(f => `<li>${f}</li>`).join('')}
                </ul>
              </div>
            ` : ''}
            
            ${interiorFeatures.length > 0 ? `
              <div class="feature-category">
                <h3>Interior</h3>
                <ul>
                  ${interiorFeatures.map(f => `<li>${f}</li>`).join('')}
                </ul>
              </div>
            ` : ''}
            
            ${exteriorFeatures.length > 0 ? `
              <div class="feature-category">
                <h3>Exterior</h3>
                <ul>
                  ${exteriorFeatures.map(f => `<li>${f}</li>`).join('')}
                </ul>
              </div>
            ` : ''}
            
            ${electronicFeatures.length > 0 ? `
              <div class="feature-category">
                <h3>Electronic</h3>
                <ul>
                  ${electronicFeatures.map(f => `<li>${f}</li>`).join('')}
                </ul>
              </div>
            ` : ''}
            
            ${safetyFeatures.length > 0 ? `
              <div class="feature-category">
                <h3>Safety</h3>
                <ul>
                  ${safetyFeatures.map(f => `<li>${f}</li>`).join('')}
                </ul>
              </div>
            ` : ''}
            
            ${additionalFeatures.length > 0 ? `
              <div class="feature-category">
                <h3>Additional</h3>
                <ul>
                  ${additionalFeatures.map(f => `<li>${f}</li>`).join('')}
                </ul>
              </div>
            ` : ''}
          </div>
          
          <div class="qr-section">
            <div class="qr-code">
              ${sourceQrCode}
              <div class="qr-label">Vehicle Details</div>
            </div>
            <div class="qr-code">
              ${carfaxQrCode}
              <div class="qr-label">CARFAX Report</div>
            </div>
          </div>
          
          <div class="disclaimer">
            It is your responsibility to address any and all differences between information on this label and the actual vehicle specifications and/or any warranties offered prior to the sale of this vehicle. Vehicle data on this label is compiled from publicly available sources believed by the Publisher to be reliable. Vehicle data may change without notice. The Publisher assumes no responsibility for errors and/or omissions in this data, the compilation of this data or sticker placement, and makes no representations express or implied to any actual or prospective purchaser of the vehicle as to the condition of the vehicle, vehicle specifications, ownership, vehicle history, equipment/accessories, price or warranties. Actual mileage may vary.
          </div>
          
          <script>
            window.onload = () => window.print();
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

      {/* Print button */}
      <Button
        onClick={handlePrintWindowSticker}
        className="flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        <PrinterIcon className="w-4 h-4 mr-2" />
        Print Window Sticker
      </Button>
    </div>
  );
};

export default WindowSticker;
