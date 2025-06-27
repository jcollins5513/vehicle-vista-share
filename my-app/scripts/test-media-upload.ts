// Simple test script to verify media upload/delete
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormDataLib = require('form-data');

// Configuration
const API_BASE_URL = 'http://localhost:3000/api';
const TEST_IMAGE_PATH = path.join(__dirname, '..', 'public', 'test-images', 'test-image.png');

async function testMediaUpload() {
  try {
    console.log('Starting media upload test...');
    
    // 1. Read the test file
    const fileStream = fs.createReadStream(TEST_IMAGE_PATH);
    const form = new FormDataLib();
    form.append('file', fileStream);
    
    console.log('Uploading file...');
    const headers = form.getHeaders ? form.getHeaders() : {};
    const uploadResponse = await axios({
      method: 'post',
      url: `${API_BASE_URL}/upload`,
      data: form,
      headers: {
        ...headers,
      },
      maxBodyLength: Infinity,
    });

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
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Status code:', error.response.status);
    } else if (error.message) {
      console.error('Error message:', error.message);
    } else {
      console.error('Unknown error occurred:', error);
    }
    process.exit(1);
  }
}

testMediaUpload();
