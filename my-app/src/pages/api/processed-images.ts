import { NextApiRequest, NextApiResponse } from 'next';
import { BackgroundRemoverService } from '../../lib/backgroundRemover';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const backgroundRemover = new BackgroundRemoverService();
    const processedImages = await backgroundRemover.getAllProcessedImages();
    
    return res.status(200).json({
      success: true,
      processedImages
    });
  } catch (error) {
    console.error('Processed images API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}