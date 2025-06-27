// Simple test script using native fetch API to test file upload
const fs = require('fs');
const path = require('path');

// Configuration
const API_URL = 'http://localhost:3000/api/upload';
const TEST_IMAGE_PATH = path.join(__dirname, '..', 'public', 'test-images', 'test-image.png');

async function testUpload() {
  try {
    console.log('🔵 Starting upload test with fetch...');
    
    // 1. Read the test file
    console.log('🔵 Reading test file...');
    const fileBuffer = fs.readFileSync(TEST_IMAGE_PATH);
    
    // 2. Create form data
    console.log('🔵 Creating form data...');
    const formData = new FormData();
    const blob = new Blob([fileBuffer], { type: 'image/png' });
    formData.append('file', blob, 'test-image.png');
    
    // 3. Send the request
    console.log('🔵 Sending upload request...');
    const response = await fetch(API_URL, {
      method: 'POST',
      body: formData,
      // Don't set Content-Type header, let the browser set it with the boundary
    });
    
    console.log('🔵 Response status:', response.status);
    
    // 4. Parse response
    let responseData;
    try {
      responseData = await response.json();
    } catch (error) {
      const text = await response.text();
      throw new Error(`Failed to parse response: ${error.message}. Response: ${text}`);
    }
    
    console.log('🔵 Response data:', JSON.stringify(responseData, null, 2));
    
    if (!response.ok) {
      throw new Error(`Upload failed with status ${response.status}: ${JSON.stringify(responseData)}`);
    }
    
    console.log('✅ Upload successful!');
    return responseData;
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    process.exit(1);
  }
}

// Run the test
testUpload().catch(console.error);
