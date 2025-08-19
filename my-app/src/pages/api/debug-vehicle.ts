import { NextApiRequest, NextApiResponse } from 'next';
import { Redis } from '@upstash/redis';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { stockNumber } = req.query;
    
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });

    if (stockNumber) {
      // Get specific vehicle
      const vehicleData = await redis.get(`vehicle:${stockNumber}`);
      
      return res.status(200).json({
        success: true,
        stockNumber,
        data: vehicleData,
        dataType: typeof vehicleData,
        hasImages: vehicleData && typeof vehicleData === 'object' && 'images' in vehicleData,
        imagesLength: vehicleData && typeof vehicleData === 'object' && 'images' in vehicleData 
          ? (vehicleData as any).images?.length || 0 
          : 0,
        keys: vehicleData && typeof vehicleData === 'object' ? Object.keys(vehicleData) : []
      });
    } else {
      // Get all vehicle keys
      const keys = await redis.keys('vehicle:*');
      const sampleData = keys.length > 0 ? await redis.get(keys[0]) : null;
      
      return res.status(200).json({
        success: true,
        totalVehicles: keys.length,
        vehicleKeys: keys.slice(0, 10), // First 10 keys
        sampleVehicle: sampleData,
        sampleDataType: typeof sampleData,
        sampleKeys: sampleData && typeof sampleData === 'object' ? Object.keys(sampleData) : []
      });
    }
  } catch (error) {
    console.error('Debug vehicle API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}