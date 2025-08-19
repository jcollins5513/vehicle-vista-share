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

### Customer Showroom Integration

1. **Individual Vehicle Processing**: Each vehicle card now has a "Remove BG" dropdown button with options to:
   - Process all images for that vehicle
   - Process individual images (up to 5 shown in dropdown)

2. **Batch Processing**: Use the scissors icon (🔪) in the showroom header to:
   - Select multiple vehicles
   - Process the first image of each selected vehicle
   - Monitor batch processing progress

3. **Content Creation Library**: Click the image icon (🖼️) in the showroom header to:
   - View all processed images organized by vehicle
   - Download individual or multiple processed images
   - Switch between grid and list views

### Web Interface

1. Start your Next.js development server:
```bash
npm run dev
```

2. Navigate to: `http://localhost:3000/customershowroom` for integrated experience

3. Or use the dedicated interface at: `http://localhost:3000/background-removal`

4. Access processed images at: `http://localhost:3000/content-creation`

### Command Line Interface

Process a specific vehicle:
```bash
npm run process-backgrounds S161
```

Process all vehicles:
```bash
npm run process-backgrounds
```

### API Endpoints

**Background Removal API** - POST `/api/background-removal`:

```javascript
// Process single image
fetch('/api/background-removal', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    stockNumber: 'S161', 
    imageIndex: 0 
  })
});

// Process all images for a vehicle
fetch('/api/background-removal', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ stockNumber: 'S161' })
});

// Batch process first images only
fetch('/api/background-removal', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    batchVehicleIds: ['S161', 'S162', 'S163'],
    processFirstImageOnly: true 
  })
});

// Process all vehicles
fetch('/api/background-removal', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ processAll: true })
});
```

**Processed Images API** - GET `/api/processed-images`:

```javascript
// Get all processed images for content creation
fetch('/api/processed-images')
  .then(response => response.json())
  .then(data => {
    console.log(data.processedImages); // Organized by vehicle stock number
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

### ⚠️ **IMPORTANT: Original Images Are Never Modified**

1. **Data Retrieval**: Fetches vehicle data from Redis using the pattern `vehicle:*`
2. **Image Download**: Downloads original images from URLs in the `images` array
3. **Background Removal**: Uses Python backgroundremover to create NEW processed images
4. **Cloud Storage**: Uploads NEW processed images to AWS S3 in the `processed/` folder
5. **Data Update**: Adds a NEW `processedImages` array to vehicle records containing:
   - `originalUrl`: **UNCHANGED** original image URL
   - `processedUrl`: **NEW** S3 URL of processed image
   - `processedAt`: Processing timestamp
   - `status`: 'completed', 'failed', or 'processing'
   - `imageIndex`: Which original image this corresponds to

### 📊 **Data Structure After Processing**

```typescript
// Your vehicle data BEFORE processing
{
  stockNumber: "S161",
  images: ["original-url-1.jpg", "original-url-2.jpg"], // ✅ UNCHANGED
  // ... other vehicle data
}

// Your vehicle data AFTER processing
{
  stockNumber: "S161", 
  images: ["original-url-1.jpg", "original-url-2.jpg"], // ✅ STILL UNCHANGED
  processedImages: [  // ✅ NEW ARRAY ADDED
    {
      originalUrl: "original-url-1.jpg",           // Reference to original
      processedUrl: "https://s3.../processed/...", // New processed image
      imageIndex: 0,                               // Which original image
      status: "completed",
      processedAt: "2025-01-17T..."
    }
  ],
  // ... other vehicle data (unchanged)
}
```

### 🎯 **Content Creation Library Features**

- **Side-by-side comparison**: Original vs processed images
- **Both versions accessible**: View and download original OR processed
- **Clear labeling**: "Original" and "Processed" badges
- **Separate actions**: Different buttons for original vs processed images
- **No data loss**: All original images remain exactly as they were

## File Structure

```
my-app/
├── src/
│   ├── lib/
│   │   └── backgroundRemover.ts           # Enhanced core service class
│   ├── components/
│   │   ├── BackgroundRemovalPanel.tsx     # Original standalone UI
│   │   ├── BackgroundRemovalButton.tsx    # Individual vehicle button
│   │   ├── BatchBackgroundRemoval.tsx     # Batch processing modal
│   │   └── ui/
│   │       ├── dropdown-menu.tsx          # Dropdown menu component
│   │       └── checkbox.tsx               # Checkbox component
│   ├── pages/
│   │   ├── api/
│   │   │   ├── background-removal.ts      # Enhanced API endpoint
│   │   │   └── processed-images.ts        # Content creation API
│   │   ├── background-removal.tsx         # Standalone interface
│   │   └── content-creation.tsx           # Content library page
│   └── app/
│       └── customershowroom/
│           └── page.tsx                   # Enhanced with BG removal
└── scripts/
    ├── setup-background-remover.js        # Setup script
    └── process-backgrounds.js             # CLI script
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