// Simple test script to verify media upload/delete
import fs from 'fs';
import path from 'path';
import axios, { AxiosError } from 'axios';
import FormData from 'form-data';

// Configuration
const API_BASE_URL = 'http://localhost:3000/api';
const TEST_IMAGE_PATH = path.join(__dirname, '..', 'public', 'test-images', 'test-image.png');

async function testMediaUpload() {
  try {
    console.log('Starting media upload test...');
    
    // 1. Read the test file
    const fileStream = fs.createReadStream(TEST_IMAGE_PATH);
    const form = new FormData();
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
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response && error.response.status === 404) {
          console.log('✅ Success! Media was deleted.');
        } else {
          console.error('❌ Error verifying deletion:', error.message);
          if (error.response) {
            console.error('Response data:', error.response.data);
            console.error('Status code:', error.response.status);
          }
        }
      } else if (error instanceof Error) {
        console.error('❌ An unexpected error occurred:', error.message);
      } else {
        console.error('❌ An unknown error occurred during deletion verification.');
      }
    }
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('❌ Error during test media upload:', error.message);
      if (error.response) {
        console.error('Response data:', error.response.data);
        console.error('Status code:', error.response.status);
      }
    } else if (error instanceof Error) {
      console.error('❌ An unexpected error occurred:', error.message);
    } else {
      console.error('❌ An unknown error occurred.');
    }
    process.exit(1);
  }
}

testMediaUpload();
