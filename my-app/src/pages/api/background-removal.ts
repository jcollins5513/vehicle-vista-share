import { NextApiRequest, NextApiResponse } from 'next';
import { BackgroundRemoverService } from '../../lib/backgroundRemover';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { stockNumber, processAll } = req.body;
    const backgroundRemover = new BackgroundRemoverService();

    if (processAll) {
      // Process all vehicles
      const results = await backgroundRemover.processAllVehicleImages();
      return res.status(200).json({
        success: true,
        message: 'Background removal completed for all vehicles',
        results
      });
    } else if (stockNumber) {
      // Process specific vehicle
      const results = await backgroundRemover.processVehicleImages(stockNumber);
      return res.status(200).json({
        success: true,
        message: `Background removal completed for vehicle ${stockNumber}`,
        results
      });
    } else {
      return res.status(400).json({
        error: 'Either stockNumber or processAll must be provided'
      });
    }
  } catch (error) {
    console.error('Background removal API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}