import { NextApiRequest, NextApiResponse } from 'next';
import { BackgroundRemoverService } from '../../lib/backgroundRemover';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { 
      stockNumber, 
      processAll, 
      imageIndex, 
      batchVehicleIds, 
      processFirstImageOnly 
    } = req.body;
    
    const backgroundRemover = new BackgroundRemoverService();

    if (batchVehicleIds && Array.isArray(batchVehicleIds)) {
      // Batch process first images only
      const results = await backgroundRemover.processBatchFirstImages(batchVehicleIds);
      return res.status(200).json({
        success: true,
        message: `Background removal completed for ${batchVehicleIds.length} vehicles (first images only)`,
        results
      });
    } else if (processAll) {
      // Process all vehicles
      const results = await backgroundRemover.processAllVehicleImages();
      return res.status(200).json({
        success: true,
        message: 'Background removal completed for all vehicles',
        results
      });
    } else if (stockNumber && imageIndex !== undefined) {
      // Process single image
      const result = await backgroundRemover.processSingleImage(stockNumber, imageIndex);
      return res.status(200).json({
        success: true,
        message: `Background removal completed for vehicle ${stockNumber}, image ${imageIndex}`,
        result
      });
    } else if (stockNumber) {
      // Process specific vehicle (all images)
      const results = await backgroundRemover.processVehicleImages(stockNumber);
      return res.status(200).json({
        success: true,
        message: `Background removal completed for vehicle ${stockNumber}`,
        results
      });
    } else {
      return res.status(400).json({
        error: 'Invalid request parameters'
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