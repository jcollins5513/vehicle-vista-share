// Simple test script to verify media upload/delete
const fs = require('fs');
const path = require('path');
const http = require('http');
const FormData = require('form-data');

// Configuration
const API_BASE_URL = 'http://localhost:3000';
const UPLOAD_ENDPOINT = '/api/upload';
const TEST_IMAGE_PATH = path.join(__dirname, '..', 'public', 'test-images', 'test-image.png');

// Helper function to make HTTP requests
function httpRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const result = {
            statusCode: res.statusCode,
            headers: res.headers,
            data: responseData ? JSON.parse(responseData) : {}
          };
          resolve(result);
        } catch (error) {
          reject(new Error(`Failed to parse response: ${error.message}`));
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    if (data) {
      req.write(data);
    }
    
    req.end();
  });
}

async function testMediaUpload() {
  try {
    console.log('🔵 Starting media upload test...');
    
    // 1. Read the test file
    console.log('🔵 Reading test file...');
    const fileBuffer = fs.readFileSync(TEST_IMAGE_PATH);
    
    // 2. Create form data
    console.log('🔵 Creating form data...');
    const form = new FormData();
    form.append('file', fileBuffer, {
      filename: 'test-image.png',
      contentType: 'image/png',
      knownLength: fileBuffer.length
    });
    
    // 3. Prepare request options
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: UPLOAD_ENDPOINT,
      method: 'POST',
      headers: {
        ...form.getHeaders(),
        'Content-Length': form.getLengthSync()
      }
    };
    
    console.log('🔵 Sending upload request...');
    console.log('🔹 Endpoint:', `${options.method} ${options.hostname}:${options.port}${options.path}`);
    console.log('🔹 Headers:', JSON.stringify(options.headers, null, 2));
    
    // 4. Send the request
    const response = await httpRequest(options, form);
    
    console.log('🔵 Response received:');
    console.log('🔹 Status:', response.statusCode);
    console.log('🔹 Headers:', JSON.stringify(response.headers, null, 2));
    console.log('🔹 Body:', JSON.stringify(response.data, null, 2));
    
    if (response.statusCode >= 200 && response.statusCode < 300) {
      console.log('✅ Upload successful!');
      return response.data;
    } else {
      throw new Error(`Upload failed with status ${response.statusCode}`);
    }

    const { url, key } = uploadResponse.data;
    console.log('✅ Upload successful!');
    console.log('   URL:', url);
    console.log('   Key:', key);

    // 2. Verify the file exists in Redis
    console.log('\n🔍 Verifying media in Redis...');
    const mediaResponse = await axios.get(`${API_BASE_URL}/media/${key}`);
    console.log('✅ Media data from Redis:', JSON.stringify(mediaResponse.data, null, 2));

    // 3. Delete the media
    console.log('\n🗑️  Deleting media...');
    const deleteResponse = await axios.delete(`${API_BASE_URL}/media/${key}`);
    console.log('✅ Delete response:', deleteResponse.data);

    // 4. Verify the file was deleted
    console.log('\n🔍 Verifying media was deleted...');
    try {
      await axios.get(`${API_BASE_URL}/media/${key}`);
      console.error('❌ Error: Media still exists after deletion');
    } catch (deleteError) {
      if (deleteError.response && deleteError.response.status === 404) {
        console.log('✅ Success! Media was deleted.');
      } else {
        console.error('❌ Error verifying deletion:', deleteError.message);
        if (deleteError.response) {
          console.error('Response data:', deleteError.response.data);
          console.error('Status code:', deleteError.response.status);
        }
      }
    }
  } catch (error) {
    console.error('❌ Test failed!');
    console.error('Error object:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
    
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response headers:', JSON.stringify(error.response.headers, null, 2));
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
      
      // If the response is a stream, try to read it
      if (error.response.data && typeof error.response.data.on === 'function') {
        let responseData = '';
        error.response.data.on('data', (chunk) => {
          responseData += chunk;
        });
        error.response.data.on('end', () => {
          console.error('Stream response data:', responseData);
        });
      }
    } else if (error.request) {
      console.error('No response received. Request details:', error.request);
    } else if (error.message) {
      console.error('Error message:', error.message);
    } else {
      console.error('Unknown error occurred:', error);
    }
    process.exit(1);
  }
}

testMediaUpload();
