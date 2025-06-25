import { prisma } from '@/lib/prisma';
import ShowroomView from '@/components/ShowroomView';

async function getShowroomData() {
  // Artificial delay to simulate network latency
  await new Promise(resolve => setTimeout(resolve, 1000));

  const vehicles = await prisma.vehicle.findMany({
    where: { status: 'available' },
    orderBy: {
      createdAt: 'desc',
    },
  });

  const customMedia = await prisma.media.findMany({
    where: { vehicleId: null },
    orderBy: {
      order: 'asc',
    },
  });

  return { vehicles, customMedia };
}

export default async function ShowroomPage() {
  const { vehicles, customMedia } = await getShowroomData();

  if ((!vehicles || vehicles.length === 0) && (!customMedia || customMedia.length === 0)) {
    // You can return a message or a different component if no vehicles are available
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
        <h1 className="text-2xl">No vehicles currently available in the showroom.</h1>
      </div>
    );
  }

  return <ShowroomView vehicles={vehicles} customMedia={customMedia} />;
}
