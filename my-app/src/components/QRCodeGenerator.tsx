'use client';

import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { PrinterIcon } from 'lucide-react';
import type { Vehicle } from '@/types';

interface QRCodeGeneratorProps {
  vehicles: Vehicle[];
}

const QRCodeGenerator = ({ vehicles }: QRCodeGeneratorProps) => {
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  const getCarfaxUrl = (vin: string) =>
    `https://www.carfax.com/VehicleHistory/p/Report.cfx?partner=DVW_1&vin=${vin}`;

  const handlePrintQRCodes = (vehicle: Vehicle) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const sourceQrCode = document
      .getElementById(`source-qr-${vehicle.stockNumber}`)?.querySelector('svg')
      ?.outerHTML;
    const carfaxQrCode = document
      .getElementById(`carfax-qr-${vehicle.stockNumber}`)?.querySelector('svg')
      ?.outerHTML;
    const vehicleDetails = `${vehicle.year} ${vehicle.make} ${vehicle.model} ${
      vehicle.trim || ''
    }`;

    printWindow.document.write(`
      <html>
        <head>
          <title>Vehicle QR Codes - ${vehicle.stockNumber}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 10px; max-width: 800px; margin: 0 auto; }
            .header { text-align: center; margin-bottom: 20px; }
            .header img { max-width: 500px; margin-bottom: 10px; }
            .qr-container { display: flex; justify-content: space-around; margin: 80px 0; }
            .qr-code { text-align: center; }
            .qr-code svg { width: 400px !important; height: 400px !important; }
            .qr-label { margin-top: 0px; font-weight: bold; }
            .vehicle-info { text-align: center; margin: 20px 0; font-size: 1.2em; }
            @media print {
              body { padding: 0; }
              .qr-code svg { width: 250px !important; height: 250px !important; }
              @page { margin: 0; size: auto; }
              head, header, footer { display: none !important; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <img src="https://bentleysupercenterqr.online/images/dealership-logo.png" alt="Dealership Logo" />
            <h2>${vehicleDetails}</h2>
            <p>Stock #: ${vehicle.stockNumber}</p>
          </div>
          <div class="qr-container">
            <div class="qr-code">${sourceQrCode}<div class="qr-label">Vehicle Details</div></div>
            <div class="qr-code">${carfaxQrCode}<div class="qr-label">CARFAX Report</div></div>
          </div>
          <script>window.onload = () => window.print();</script>
        </body>
      </html>
    `);
  };

  const handlePrintAllQRCodes = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const allQrCodesHtml = vehicles
      .map((vehicle) => {
        const sourceQrCode = document
          .getElementById(`source-qr-${vehicle.stockNumber}`)?.querySelector('svg')
          ?.outerHTML;
        const carfaxQrCode = document
          .getElementById(`carfax-qr-${vehicle.stockNumber}`)?.querySelector('svg')
          ?.outerHTML;
        const vehicleDetails = `${vehicle.year} ${vehicle.make} ${vehicle.model} ${
          vehicle.trim || ''
        }`;
        return `
        <div class="page-break">
          <div class="header">
            <img src="https://bentleysupercenterqr.online/images/dealership-logo.png" alt="Dealership Logo" />
            <h2>${vehicleDetails}</h2>
            <p>Stock #: ${vehicle.stockNumber}</p>
          </div>
          <div class="qr-container">
            <div class="qr-code">${sourceQrCode}<div class="qr-label">Vehicle Details</div></div>
            <div class="qr-code">${carfaxQrCode}<div class="qr-label">CARFAX Report</div></div>
          </div>
        </div>`;
      })
      .join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>All Vehicle QR Codes</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 10px; max-width: 800px; margin: 0 auto; }
            .header { text-align: center; margin-bottom: 20px; }
            .header img { max-width: 500px; margin-bottom: 10px; }
            .qr-container { display: flex; justify-content: space-around; margin: 80px 0; }
            .qr-code { text-align: center; }
            .qr-code svg { width: 400px !important; height: 400px !important; }
            .qr-label { margin-top: 0px; font-weight: bold; }
            .page-break { page-break-after: always; margin-bottom: 30px; }
            @media print {
              body { padding: 0; }
              .qr-code svg { width: 250px !important; height: 250px !important; }
              @page { margin: 0; size: auto; }
              head, header, footer { display: none !important; }
            }
          </style>
        </head>
        <body>
          ${allQrCodesHtml}
          <script>window.onload = () => window.print();</script>
        </body>
      </html>
    `);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end mb-4">
        <button
          onClick={handlePrintAllQRCodes}
          className="flex items-center px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          <PrinterIcon className="w-4 h-4 mr-2" />
          Print All QR Codes
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {vehicles.map((vehicle) => (
          <div key={vehicle.stockNumber} className="p-4 border rounded-lg shadow-sm bg-white">
            <div className="text-lg font-semibold mb-2">
              {vehicle.year} {vehicle.make} {vehicle.model} {vehicle.trim}
            </div>
            <div className="text-sm text-gray-500">Stock #{vehicle.stockNumber}</div>
            <div className="text-xl font-bold text-blue-600 mt-1">
              ${vehicle.price.toLocaleString()}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div id={`source-qr-${vehicle.stockNumber}`} className="flex flex-col items-center">
                <QRCodeSVG value={vehicle.sourceUrl || ''} size={150} level="H" includeMargin />
                <div className="text-sm font-medium mt-2">Vehicle Details</div>
              </div>
              <div id={`carfax-qr-${vehicle.stockNumber}`} className="flex flex-col items-center">
                <QRCodeSVG value={getCarfaxUrl(vehicle.vin)} size={150} level="H" includeMargin />
                <div className="text-sm font-medium mt-2">CARFAX Report</div>
              </div>
            </div>
            <div className="mt-4 flex justify-center">
              <button
                onClick={() => handlePrintQRCodes(vehicle)}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                <PrinterIcon className="w-4 h-4 mr-2" />
                Print QR Codes
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default QRCodeGenerator;
