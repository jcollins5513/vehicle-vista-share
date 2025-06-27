const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');

async function runTest() {
  try {
    console.log('🚀 Starting simple upload test...');
    
    // Configuration
    const API_URL = 'http://localhost:3000/api/upload';
    const TEST_IMAGE_PATH = path.join(__dirname, '..', 'public', 'test-images', 'test-image.png');
    
    // Verify test file exists
    try {
      await fs.promises.access(TEST_IMAGE_PATH, fs.constants.F_OK);
      console.log('✅ Test file exists:', TEST_IMAGE_PATH);
    } catch (err) {
      console.error('❌ Test file not found:', TEST_IMAGE_PATH);
      console.error('Please make sure the test image exists at the specified path');
      process.exit(1);
    }
    
    // Create form data
    const form = new FormData();
    const fileStream = fs.createReadStream(TEST_IMAGE_PATH);
    
    // Handle file stream errors
    fileStream.on('error', (err) => {
      console.error('❌ File stream error:', err);
      process.exit(1);
    });
    
    // Append file with metadata
    form.append('file', fileStream, {
      filename: 'test-image.png',
      contentType: 'image/png',
      knownLength: (await fs.promises.stat(TEST_IMAGE_PATH)).size
    });
    
    console.log('📤 Preparing upload request...');
    
    // Get headers with content length
    const headers = {
      ...form.getHeaders(),
      'Content-Length': form.getLengthSync()
    };
    
    console.log('📝 Request headers:', JSON.stringify(headers, null, 2));
    
    // Make the request
    console.log('🔄 Sending request to:', API_URL);
    const response = await axios.post(API_URL, form, {
      headers,
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
      timeout: 30000 // 30 seconds timeout
    });
    
    console.log('✅ Upload successful!');
    console.log('📊 Response status:', response.status);
    console.log('📦 Response data:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('❌ Test failed with error:');
    
    if (error.response) {
      // Server responded with a status code outside 2xx
      console.error('Status:', error.response.status);
      console.error('Headers:', JSON.stringify(error.response.headers, null, 2));
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      // Request was made but no response received
      console.error('No response received. Request details:', {
        method: error.request.method,
        path: error.request.path,
        host: error.request.host,
        protocol: error.request.protocol
      });
    } else {
      // Something else went wrong
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        stack: error.stack
      });
    }
    
    process.exit(1);
  }
}

// Run the test
runTest();
