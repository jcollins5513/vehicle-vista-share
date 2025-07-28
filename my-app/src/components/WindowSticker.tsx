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
              padding: 20px;
              background: white;
              color: black;
              line-height: 1.3;
              max-width: 8.5in;
              margin: 0 auto;
              min-height: 11in;
            }

            .header {
              display: flex;
              align-items: center;
              margin-bottom: 25px;
              border-bottom: 3px solid #000;
              padding-bottom: 15px;
            }

            .header img {
              width: 250px;
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
              margin-bottom: 25px;
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
              margin-bottom: 25px;
            }

            .features-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 15px;
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
            }
            
            @media print {
              body {
                padding: 10px;
                max-width: none;
              }

              .header img {
                width: 150px;
              }

              .qr-code svg {
                width: 70px !important;
                height: 70px !important;
              }

              .disclaimer {
                font-size: 6px;
              }

              @page {
                margin: 0.5in;
                size: letter;
              }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <img src="/Bentley-logo-groups.svg" alt="Bentley Logo" />
            <div class="header-text">
              <div class="vehicle-title">${vehicleTitle}</div>
              <div class="stock-info">Stock #: ${vehicle.stockNumber} | VIN: ${vehicle.vin}</div>
              <div class="stock-info">Price: $${vehicle.price?.toLocaleString() || 'Contact for Price'}</div>
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
