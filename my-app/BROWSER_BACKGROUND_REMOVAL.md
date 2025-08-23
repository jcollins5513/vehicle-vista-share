# Browser-Based Background Removal

This application now uses browser-based background removal powered by `@imgly/background-removal` instead of server-side Python processing.

## What Changed

### ✅ Added
- Browser-based background removal using `@imgly/background-removal`
- Individual vehicle API endpoint: `/api/vehicles/[stockNumber]`
- Updated `BackgroundRemovalPanel` and `BackgroundRemovalButton` components
- Updated `removeBackground` utility function

### ❌ Removed
- Server-side `BackgroundRemoverService` class
- Python `backgroundremover` dependency
- Server-side API routes:
  - `/api/background-removal`
  - `/api/test-backgroundremover`
  - `/api/test-image-processing`
  - `/api/processed-images`
- Setup and processing scripts:
  - `scripts/setup-background-remover.js`
  - `scripts/process-backgrounds.js`

## Benefits

1. **No Server Dependencies**: No need to install Python or backgroundremover package
2. **Faster Processing**: Processing happens directly in the browser
3. **Better User Experience**: Real-time feedback and no server load
4. **Easier Deployment**: No complex server-side setup required
5. **Cross-Platform**: Works consistently across all platforms

## How to Use

### Background Removal Panel
1. Navigate to the Background Removal Panel in your app
2. Enter a stock number to process a single vehicle
3. Or click "Process All Vehicle Images" to process all vehicles
4. Use "Test Browser Background Removal" to test with a sample image

### Background Removal Button
- Available on individual vehicle cards
- Click the dropdown to process individual images or all images
- Processing happens in real-time with progress feedback

### Programmatic Usage
```typescript
import { removeBackground } from '@/utils/removeBackground';

// For File objects
const processedBlob = await removeBackground(file);

// For URLs (in components)
const { removeBackground: imglyRemoveBackground } = await import('@imgly/background-removal');
const result = await imglyRemoveBackground(imageUrl, {
  output: {
    format: 'image/png',
    quality: 0.8
  }
});
```

## Technical Details

- Uses `@imgly/background-removal` v1.7.0
- Processing happens entirely in the browser using WebAssembly
- Supports various image formats (JPEG, PNG, WebP)
- Output format is PNG with transparency
- Quality setting is configurable (0.1 to 1.0)

## Performance Considerations

- Processing large images may take longer
- Multiple simultaneous processes are handled sequentially to avoid overwhelming the browser
- Memory usage scales with image size
- Consider implementing image resizing for very large images if needed