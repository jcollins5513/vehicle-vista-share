# Vehicle Background Removal Integration

This integration allows you to automatically remove backgrounds from vehicle photos stored in your Redis database using AI-powered background removal technology.

## Features

- 🚗 Process individual vehicles or all vehicles at once
- 🤖 AI-powered background removal using Python backgroundremover
- ☁️ Automatic upload of processed images to AWS S3
- 📊 Real-time processing status and progress tracking
- 🔄 Integration with existing Redis vehicle data
- 🖥️ Web UI and command-line interfaces

## Prerequisites

### System Requirements
- **Python 3.6+** with pip
- **Node.js 16+** (already installed)
- **ffmpeg** (for image processing)

### Windows Installation
```bash
# Install Python from https://python.org
# Make sure to check "Add Python to PATH" during installation

# Install ffmpeg (using chocolatey - optional)
choco install ffmpeg

# Or download from https://ffmpeg.org/download.html
```

### Linux/macOS Installation
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install python3 python3-pip python3-dev ffmpeg

# macOS (using Homebrew)
brew install python ffmpeg
```

## Setup Instructions

### 1. Install Python Dependencies

Run the automated setup script:
```bash
npm run setup-bg-remover
```

Or install manually:
```bash
pip install --upgrade backgroundremover
```

### 2. Verify Installation

Test that backgroundremover is working:
```bash
backgroundremover --help
```

### 3. Environment Variables

Your `.env` file already contains the required AWS and Redis configurations:
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY` 
- `AWS_REGION`
- `VEHICLE_MEDIA_BUCKET`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

## Usage

### Web Interface

1. Start your Next.js development server:
```bash
npm run dev
```

2. Navigate to: `http://localhost:3000/background-removal`

3. Use the interface to:
   - Process a single vehicle by stock number
   - Process all vehicles at once
   - Monitor progress and view results

### Command Line Interface

Process a specific vehicle:
```bash
npm run process-backgrounds S161
```

Process all vehicles:
```bash
npm run process-backgrounds
```

### API Endpoint

Make POST requests to `/api/background-removal`:

```javascript
// Process single vehicle
fetch('/api/background-removal', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ stockNumber: 'S161' })
});

// Process all vehicles
fetch('/api/background-removal', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ processAll: true })
});
```

### Programmatic Usage

```typescript
import { BackgroundRemoverService } from '@/lib/backgroundRemover';

const service = new BackgroundRemoverService();

// Process single vehicle
const results = await service.processVehicleImages('S161');

// Process all vehicles
const allResults = await service.processAllVehicleImages();
```

## How It Works

1. **Data Retrieval**: Fetches vehicle data from Redis using the pattern `vehicle:*`
2. **Image Download**: Downloads original images from URLs in the `images` array
3. **Background Removal**: Uses Python backgroundremover to process each image
4. **Cloud Storage**: Uploads processed images to AWS S3 in the `processed/` folder
5. **Data Update**: Updates vehicle records with `processedImages` array containing:
   - `originalUrl`: Original image URL
   - `processedUrl`: S3 URL of processed image
   - `processedAt`: Processing timestamp
   - `status`: 'completed', 'failed', or 'processing'

## File Structure

```
my-app/
├── src/
│   ├── lib/
│   │   └── backgroundRemover.ts      # Core service class
│   ├── components/
│   │   └── BackgroundRemovalPanel.tsx # React UI component
│   ├── pages/
│   │   ├── api/
│   │   │   └── background-removal.ts  # API endpoint
│   │   └── background-removal.tsx     # Web interface page
└── scripts/
    ├── setup-background-remover.js    # Setup script
    └── process-backgrounds.js         # CLI script
```

## Troubleshooting

### Common Issues

**Python not found:**
- Ensure Python 3.6+ is installed and in your PATH
- On Windows, reinstall Python with "Add to PATH" checked

**backgroundremover command not found:**
- Run: `pip install --upgrade backgroundremover`
- Check if pip installed to the correct Python environment

**Permission errors on Windows:**
- Run command prompt as Administrator
- Or use: `python -m pip install backgroundremover`

**Memory issues with large images:**
- The service processes images one at a time to manage memory
- Consider resizing very large images before processing

**S3 upload failures:**
- Verify AWS credentials in `.env`
- Check S3 bucket permissions
- Ensure bucket exists and is accessible

### Performance Tips

- Processing time depends on image size and complexity
- Typical processing time: 5-15 seconds per image
- Consider running background processing during off-peak hours
- Monitor S3 storage costs for processed images

## Integration with Existing Code

The processed images are stored in your vehicle data structure:

```typescript
interface VehicleData {
  stockNumber: string;
  images: string[];           // Original images
  processedImages?: {         // Added by background removal
    originalUrl: string;
    processedUrl: string;
    processedAt: Date;
    status: 'completed' | 'failed' | 'processing';
  }[];
  // ... other vehicle properties
}
```

You can access processed images in your existing components:

```typescript
// Get vehicle data from Redis
const vehicle = await redis.get(`vehicle:${stockNumber}`);

// Use processed images if available, fallback to originals
const imagesToDisplay = vehicle.processedImages?.length 
  ? vehicle.processedImages.filter(img => img.status === 'completed').map(img => img.processedUrl)
  : vehicle.images;
```

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Verify all prerequisites are installed
3. Check the browser console and server logs for error details
4. Ensure your Redis data structure matches the expected format