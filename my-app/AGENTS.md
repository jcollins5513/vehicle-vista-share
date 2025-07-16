
- **Components**  

Create a new page C:\Users\justi\projects\vehicle-vista-share\my-app\src\app\tools\page.tsx that should have the following components. 
 

C:\Users\justi\projects\vehicle-vista-share\my-app\src\components\AIFloatingChatbot.tsx
C:\Users\justi\projects\vehicle-vista-share\my-app\src\components\AppointmentCalendar.tsx
C:\Users\justi\projects\vehicle-vista-share\my-app\src\components\VehicleSelector.tsx
C:\Users\justi\projects\vehicle-vista-share\my-app\src\components\ShowroomTools.tsx
C:\Users\justi\projects\vehicle-vista-share\my-app\src\components\MediaUploader.tsx - Allows user to load manual media using Amazone s3 storage. that can be 

There should be a customer share implementation that uses VehicleSelector.tsx to select and get link to customer/page.tsx that shows the selected individual vehicle from REDIS dealership:inventory that the user will share with client. The sharing feature sould send the customer a components/customerview/page.tsx that should show that individual inventory and a slideshow of all the photos of that vehicle and use the player from "@/registry/magicui/hero-video-dialog"; to show the slideshow.

ADD THIS QR CODE code to the tools page. THE PRINTED VERSION OF THE QR QODE should remain as is, but what shows up on the tools/page.tsx should be more compact and include the forementioned components:


'use client';

import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Vehicle } from '@/types/vehicle';
import { PrinterIcon } from 'lucide-react';

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

    const sourceQrCode = document.getElementById(`source-qr-${vehicle.stockNumber}`)?.querySelector('svg')?.outerHTML;
    const carfaxQrCode = document.getElementById(`carfax-qr-${vehicle.stockNumber}`)?.querySelector('svg')?.outerHTML;
    const vehicleDetails = `${vehicle.year} ${vehicle.make} ${vehicle.model} ${vehicle.trim || ''}`;

    printWindow.document.write(`
      <html>
        <head>
          <title>Vehicle QR Codes - ${vehicle.stockNumber}</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              padding: 10px;
              max-width: 800px;
              margin: 0 auto;
            }
            .header {
              text-align: center;
              margin-bottom: 20px;
            }
            .header img {
              max-width: 500px;
              margin-bottom: 10px;
            }
            .qr-container {
              display: flex;
              justify-content: space-around;
              margin: 80px 0;
            }
            .qr-code {
              text-align: center;
            }
            .qr-code svg {
              width: 400px !important;
              height: 400px !important;
            }
            .qr-label {
              margin-top: 0px;
              font-weight: bold;
            }
            .vehicle-info {
              text-align: center;
              margin: 20px 0;
              font-size: 1.2em;
            }
            @media print {
              body {
                padding: 0;
              }
              .qr-code svg {
                width: 250px !important;
                height: 250px !important;
              }
              @page {
                margin: 0;
                size: auto;
              }
              /* Hide any browser-added headers and footers */
              head, header, footer {
                display: none !important;
              }
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
            <div class="qr-code">
              ${sourceQrCode}
              <div class="qr-label">Vehicle Details</div>
            </div>
            <div class="qr-code">
              ${carfaxQrCode}
              <div class="qr-label">CARFAX Report</div>
            </div>
          </div>
          <script>
            window.onload = () => window.print();
          </script>
        </body>
      </html>
    `);
  };

  const handlePrintAllQRCodes = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const allQrCodesHtml = vehicles.map(vehicle => {
      const sourceQrCode = document.getElementById(`source-qr-${vehicle.stockNumber}`)?.querySelector('svg')?.outerHTML;
      const carfaxQrCode = document.getElementById(`carfax-qr-${vehicle.stockNumber}`)?.querySelector('svg')?.outerHTML;
      const vehicleDetails = `${vehicle.year} ${vehicle.make} ${vehicle.model} ${vehicle.trim || ''}`;

      return `
        <div class="page-break">
          <div class="header">
            <img src="https://bentleysupercenterqr.online/images/dealership-logo.png" alt="Dealership Logo" />
            <h2>${vehicleDetails}</h2>
            <p>Stock #: ${vehicle.stockNumber}</p>
          </div>
          <div class="qr-container">
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
      `;
    }).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>All Vehicle QR Codes</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              padding: 10px;
              max-width: 800px;
              margin: 0 auto;
            }
            .header {
              text-align: center;
              margin-bottom: 20px;
            }
            .header img {
              max-width: 500px;
              margin-bottom: 10px;
            }
            .qr-container {
              display: flex;
              justify-content: space-around;
              margin: 80px 0;
            }
            .qr-code {
              text-align: center;
            }
            .qr-code svg {
              width: 400px !important;
              height: 400px !important;
            }
            .qr-label {
              margin-top: 0px;
              font-weight: bold;
            }
            .page-break {
              page-break-after: always;
              margin-bottom: 30px;
            }
            @media print {
              body {
                padding: 0;
              }
              .qr-code svg {
                width: 250px !important;
                height: 250px !important;
              }
              @page {
                margin: 0;
                size: auto;
              }
              /* Hide any browser-added headers and footers */
              head, header, footer {
                display: none !important;
              }
            }
          </style>
        </head>
        <body>
          ${allQrCodesHtml}
          <script>
            window.onload = () => window.print();
          </script>
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
              {/* Source URL QR Code */}
              <div id={`source-qr-${vehicle.stockNumber}`} className="flex flex-col items-center">
                <QRCodeSVG
                  value={vehicle.sourceUrl || ''}
                  size={200}
                  level="H"
                  includeMargin={true}
                />
                <div className="text-sm font-medium mt-2">Vehicle Details</div>
              </div>

              {/* CARFAX QR Code */}
              <div id={`carfax-qr-${vehicle.stockNumber}`} className="flex flex-col items-center">
                <QRCodeSVG
                  value={getCarfaxUrl(vehicle.vin)}
                  size={200}
                  level="H"
                  includeMargin={true}
                />
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

Storage should be s3 for manually loaded media and REDIS Upstash using dealership:inventory key. there should be a git action to scrape every 24 hours. That needs to be changed to every 48 hours. If we need to add page Postgresql using PRISMA we can. 
## Project Overview 
- **Stack:** Next.js 15 App Router (in `my-app/`), TypeScript, Tailwind (shadcn/ui). Uses Prisma (DB), AWS S3 for media, Upstash Redis for caching.

## Environment & Setup 
- **Env Vars:** AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, VEHICLE_MEDIA_BUCKET must be set (S3 uploads):contentReference[oaicite:19]{index=19}. Upstash Redis URL & TOKEN needed for caching:contentReference[oaicite:20]{index=20}.  
- **Directory:** Run all commands in `my-app/` (contains package.json).

## Testing & Validation 
- **Lint:** Run `npm run lint` and fix any issues before committing:contentReference[oaicite:21]{index=21}.  
- **Type Check:** Project must build with no TypeScript errors (`npm run build`).  
- **Tests:** Run `npm test` (Jest) – all tests must pass. Fix or update tests if needed:contentReference[oaicite:22]{index=22}.  

## Coding Conventions 
- **TypeScript:** Use strict typing; no `any` unless unavoidable.  
- **Components:** Follow existing patterns (use shadcn/UI components and Tailwind for styling). No inline styles; ensure responsive classes for mobile.  
- **State & Data:** Use SWR or React state as in existing code for data fetching and state management (e.g., see how `VehicleSelector` and `CustomerView` manage selected vehicle state).  
- **Logging:** Use `console.error`/`console.log` as seen in code (with emojis like 🔵/❌ for clarity in server logs).

## Feature Notes 
- **Media Upload:** Uploaded files go to S3. After uploading, call `redisService.cacheMedia` to save media metadata in Redis:contentReference[oaicite:23]{index=23}:contentReference[oaicite:24]{index=24}. Scraped vehicle images remain in `vehicle.images` array. The UI (slideshow/gallery) merges both: stock images plus any `Media` items for that vehicle.  
- **Customer Share Link:** Generating a link copies `${window.location.origin}/customer/{vehicleId}` to clipboard:contentReference[oaicite:25]{index=25}. The **CustomerView** page displays the vehicle’s details and an image carousel (using `selectedVehicle.images`):contentReference[oaicite:26]{index=26}:contentReference[oaicite:27]{index=27}. It also provides a dropdown to switch among all inventory vehicles:contentReference[oaicite:28]{index=28}. Only one vehicle ID is supported per share link (multi-vehicle sharing may come later).  
- **Known Issues:** *CustomerView* has some flashing/hydration issues and type errors to resolve – keep an eye on console warnings. Ensure no regressions on these fronts when modifying related code.
