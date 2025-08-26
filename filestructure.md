# Vehicle Vista Share - File Structure

## Project Overview
A vehicle showroom application with scraping capabilities for Bentley SuperCenter inventory.

## Root Directory Structure
```
vehicle-vista-share/
├── .git/                          # Git repository
├── .yoyo/                         # YoYo configuration
├── .config/                       # Configuration files
├── .vscode/                       # VS Code settings
├── .cursor/                       # Cursor IDE settings
├── .github/                       # GitHub workflows
├── .windsurf/                     # Windsurf configuration
├── my-app/                        # Main Next.js application
├── granular-plan.md               # Session-specific task breakdown
├── master-plan.md                 # High-level project roadmap
├── filestructure.md               # This file - project structure tracking
├── .gitignore                     # Git ignore rules
├── README.md                      # Project documentation
├── DiscordShowroom.tsx            # Discord-themed showroom component
├── QuantumShowroom.tsx            # Quantum-themed showroom component
└── CinematicShowroom.tsx          # Cinematic-themed showroom component
```

## Main Application Structure (my-app/)
```
my-app/
├── src/                           # Source code
│   ├── app/                       # Next.js app directory
│   ├── components/                # React components
│   ├── lib/                       # Utility libraries
│   ├── types/                     # TypeScript type definitions
│   ├── hooks/                     # Custom React hooks
│   ├── utils/                     # Utility functions
│   └── generated/                 # Generated files
├── prisma/                        # Database schema and migrations
├── public/                        # Static assets
├── scripts/                       # Utility scripts (including scraper)
├── package.json                   # Dependencies and scripts
├── next.config.js                 # Next.js configuration
├── tailwind.config.js             # Tailwind CSS configuration
└── tsconfig.json                  # TypeScript configuration
```

## Key Files Added/Modified
- `filestructure.md` - Created to track project structure (2025-01-05)
- `my-app/scripts/scrape.js` - Vehicle inventory scraper (photo link extraction fixed)
- `my-app/src/app/background-removal-test/page.tsx` - Background removal method comparison test page (2025-01-05)

## Content Creator Workflow Enhancements (2025-01-05)
- `my-app/src/components/ManualVehiclePhotoUpload.tsx` - Enhanced with asset marking functionality for marketing vs temporary use
- `my-app/src/app/content-creation/page.tsx` - Updated to handle asset marking and categorization
- `my-app/src/components/UnifiedVisualEditor.tsx` - Enhanced asset display with marketing indicators and better categorization
- `my-app/src/app/api/assets/upload/route.ts` - Updated to handle asset marking metadata
- `my-app/src/app/api/assets/route.ts` - Enhanced to properly parse and return asset marking information
- `my-app/src/lib/s3.ts` - Updated uploadFileToAssets to support marketing asset organization

## Auto Background Removal Enhancement (2025-01-05)
- `my-app/src/components/ManualVehiclePhotoUpload.tsx` - Added automatic background removal for first vehicle image when no processed images exist

## Notes
- ✅ Fixed: Photo URL extraction now uses correct format: `https://www.bentleysupercenter.com/inventoryphotos/{carId}/{vin}/ip/{imageNumber}.jpg`
- ✅ Fixed: Car ID extraction (not dealer ID) - each car has unique ID (19779, 18411, etc.)
- 🔧 **IMPROVED**: Enhanced car ID extraction to ensure each car gets unique ID:
  - Data attributes (data-car-id, data-vehicle-id, data-inventory-id, etc.)
  - Existing image URLs on the page
  - Vehicle detail page URLs
  - **NEW**: Visiting individual vehicle detail pages to extract unique car IDs
  - **NEW**: Stock number as potential car ID
  - **NEW**: Hash-based unique car ID generation as fallback
- ✅ **FIXED**: Clean URLs - removed all query parameters (timestamp, bg-color, width, etc.)
- ✅ **FIXED**: Puppeteer API error (page.context() → page.browser())
- ✅ **FIXED**: Avoid Carfax URLs when looking for vehicle detail pages
- ✅ Added: Debug logging for car ID and image URL generation
- ✅ Added: Support for multiple image formats (jpg, png, jpeg)
- ✅ Added: Fallback to existing image URLs if found

## Content Creator Workflow Enhancements
- ✅ **NEW**: Asset marking functionality - users can mark assets for future marketing use vs temporary use
- ✅ **NEW**: Asset categorization system with predefined categories (logos, backgrounds, badges, textures, overlays, general)
- ✅ **NEW**: Enhanced visual editor with dedicated "Marketing" tab for easy access to marked marketing assets
- ✅ **NEW**: Asset organization in S3 with marketing/general prefixes for better file management
- ✅ **IMPROVED**: Better asset display with marketing indicators and category badges in the visual editor
- ✅ **IMPROVED**: Enhanced upload workflow with clear options for asset marking and categorization

## Auto Background Removal Enhancement
- ✅ **NEW**: Automatic background removal for first vehicle image when no processed images exist
- ✅ **NEW**: Real-time processing indicator with loading spinner and status messages
- ✅ **NEW**: Seamless integration with existing vehicle selection workflow
- ✅ **IMPROVED**: Enhanced user experience with automatic processing on vehicle selection
- ✅ **FIXED**: CORS issues in background removal by using existing proxy endpoint for external image fetching
- ✅ **FIXED**: Asset upload failures by properly handling blob URLs and data URLs in save functionality

## Visual Editor Asset Library Enhancement
- ✅ **NEW**: Asset Library tab in Visual Editor for direct asset upload and management
- ✅ **NEW**: Asset categorization and marketing asset marking within Visual Editor
- ✅ **NEW**: "Save to Library" functionality for individual assets
- ✅ **NEW**: Real-time background removal processing for uploaded assets
- ✅ **IMPROVED**: Seamless integration between auto-processed vehicle images and asset library
- ✅ **IMPROVED**: Enhanced workflow allowing asset management during content creation

## Processed Images Persistence Fix
- ✅ **NEW**: API endpoint `/api/processed-images/save` to save processed images to Redis
- ✅ **FIXED**: Auto-processed vehicles from Manual Upload now persist and appear in Vehicle Selection tab
- ✅ **FIXED**: Type compatibility issues between Vehicle interfaces
- ✅ **IMPROVED**: Seamless integration between Manual Upload and Vehicle Selection workflows

## Manual Upload Workflow Enhancement
- ✅ **FIXED**: Manual Upload tab now maintains selected vehicle when switching between vehicle photos and general assets
- ✅ **FIXED**: General assets upload no longer requires vehicle selection validation
- ✅ **IMPROVED**: Users can now upload general assets without re-selecting vehicle after processing vehicle photos
- ✅ **IMPROVED**: Enhanced workflow allowing seamless switching between vehicle and asset upload modes

## Visual Editor Asset Library Fix
- ✅ **FIXED**: Replaced HTML select with proper shadcn/ui Select component for better functionality
- ✅ **FIXED**: Asset category dropdown now shows all available options (General, Logos & Branding, Backgrounds, Badges & Icons, Textures & Patterns, Overlays & Effects)
- ✅ **IMPROVED**: Enhanced dropdown styling and user experience in Visual Editor Asset Library

## Visual Editor Major Enhancement
- ✅ **NEW**: Organized asset tabs by category (Backgrounds, Overlays & Effects, Textures & Patterns, Marketing, Logos & Branding, Badges & Icons, General)
- ✅ **NEW**: Color-coded tabs (Manual Upload in blue, Vehicles in green, others in white)
- ✅ **NEW**: Vehicles tab shows all stored vehicles with image previews and ability to switch vehicles on-the-fly
- ✅ **NEW**: Enhanced canvas with unrestricted movement - assets can move beyond canvas boundaries
- ✅ **NEW**: Resize functionality with 8 resize handles (corners and edges) for precise asset sizing
- ✅ **IMPROVED**: Manual Upload tab no longer switches to next tab after saving vehicle photos
- ✅ **IMPROVED**: Better asset organization and workflow efficiency

## Drag and Drop File Upload Enhancement
- ✅ **NEW**: Created reusable `DragAndDropUpload` component for consistent file upload experience across the application
- ✅ **NEW**: Drag and drop functionality added to all asset upload areas:
  - Manual Vehicle Photo Upload component
  - Unified Visual Editor asset library
  - Asset Manager component
  - Admin 360° image upload page
- ✅ **IMPROVED**: Enhanced user experience with visual feedback during drag operations
- ✅ **IMPROVED**: Consistent upload interface across all components
- ✅ **IMPROVED**: Better accessibility with both click and drag & drop options 