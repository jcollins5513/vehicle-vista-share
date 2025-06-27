import { notFound } from 'next/navigation';
import { redisService } from '@/lib/services/redisService';
import MediaGallery from '@/components/MediaGallery';

interface VehicleDetailPageProps {
  params: {
    stockNumber: string;
  };
}

async function getVehicle(stockNumber: string) {
  const vehicles = await redisService.getVehicles();
  const vehicle = vehicles.find(v => v.stockNumber === stockNumber) || null;
  return vehicle;
}

export default async function VehicleDetailPage({ params }: VehicleDetailPageProps) {
  const vehicle = await getVehicle(params.stockNumber);

  if (!vehicle) {
    notFound();
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-4">{`${vehicle.year} ${vehicle.make} ${vehicle.model}`}</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <MediaGallery media={vehicle.media} />
        </div>
        <div>
          <h2 className="text-2xl font-semibold mb-2">Details</h2>
          <p><strong>Price:</strong> ${vehicle.price.toLocaleString()}</p>
          <p><strong>Mileage:</strong> {vehicle.mileage.toLocaleString()} miles</p>
          <p><strong>Stock #:</strong> {vehicle.stockNumber}</p>
          <p><strong>VIN:</strong> {vehicle.vin}</p>
          <p><strong>Exterior Color:</strong> {vehicle.color}</p>
          <p><strong>Engine:</strong> {vehicle.engine}</p>
          <p><strong>Transmission:</strong> {vehicle.transmission}</p>
          <p><strong>Body Style:</strong> {vehicle.bodyStyle}</p>
        </div>
      </div>
    </div>
  );
}
