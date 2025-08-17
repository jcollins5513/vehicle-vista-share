#!/usr/bin/env node

/**
 * Command-line script to process vehicle backgrounds
 * Usage: node scripts/process-backgrounds.js [stockNumber]
 */

const { BackgroundRemoverService } = require('../src/lib/backgroundRemover');

async function main() {
  const args = process.argv.slice(2);
  const stockNumber = args[0];

  console.log('🚀 Starting background removal process...\n');

  try {
    const service = new BackgroundRemoverService();

    if (stockNumber) {
      console.log(`Processing vehicle: ${stockNumber}`);
      const results = await service.processVehicleImages(stockNumber);
      
      console.log('\n✅ Processing completed!');
      console.log(`Processed ${results.length} images for vehicle ${stockNumber}`);
      
      results.forEach((result, index) => {
        console.log(`  Image ${index + 1}: ${result.status}`);
        if (result.status === 'completed') {
          console.log(`    Processed URL: ${result.processedUrl}`);
        }
      });
    } else {
      console.log('Processing all vehicles...');
      const results = await service.processAllVehicleImages();
      
      console.log('\n✅ Processing completed!');
      
      const vehicleCount = Object.keys(results).length;
      const totalImages = Object.values(results).reduce((sum, images) => sum + images.length, 0);
      const successfulImages = Object.values(results).reduce(
        (sum, images) => sum + images.filter(img => img.status === 'completed').length, 
        0
      );
      
      console.log(`Processed ${vehicleCount} vehicles`);
      console.log(`Total images: ${totalImages}`);
      console.log(`Successful: ${successfulImages}`);
      console.log(`Failed: ${totalImages - successfulImages}`);
      
      // Show detailed results
      Object.entries(results).forEach(([stock, images]) => {
        const successful = images.filter(img => img.status === 'completed').length;
        console.log(`  ${stock}: ${successful}/${images.length} images processed`);
      });
    }
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}