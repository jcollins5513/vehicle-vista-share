import { NextResponse } from 'next/server';

// This is a minimal test endpoint to debug file uploads
export async function POST(request: Request) {
  console.log('🔵 POST /api/test-upload - Starting request processing');
  
  try {
    // Log request headers
    const headers = Object.fromEntries(request.headers.entries());
    console.log('🔵 Request headers:', JSON.stringify(headers, null, 2));
    
    // Check content type
    const contentType = headers['content-type'] || '';
    if (!contentType.includes('multipart/form-data')) {
      console.error('❌ Invalid content type:', contentType);
      return NextResponse.json(
        { error: 'Expected multipart/form-data' },
        { status: 400 }
      );
    }
    
    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file');
    
    // Validate file
    if (!file) {
      console.error('❌ No file found in form data');
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }
    
    // Log file info
    console.log('🔵 File info:', {
      type: typeof file,
      constructor: file?.constructor?.name,
      size: file instanceof File ? file.size : 'N/A',
      fileType: file instanceof File ? file.type : 'N/A',
      name: file instanceof File ? file.name : 'N/A',
    });
    
    // If we got this far, the basic file upload is working
    return NextResponse.json({
      success: true,
      message: 'File received successfully',
      fileInfo: {
        type: typeof file,
        size: file instanceof File ? file.size : 'N/A',
        fileType: file instanceof File ? file.type : 'N/A',
        name: file instanceof File ? file.name : 'N/A',
      }
    });
    
  } catch (error) {
    console.error('❌ Test upload error:', error);
    
    // Return detailed error information
    const errorInfo = {
      name: error instanceof Error ? error.name : 'UnknownError',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      constructor: error?.constructor?.name,
      additionalInfo: {
        isError: error instanceof Error,
        isTypeError: error instanceof TypeError,
        errorAsString: String(error),
      }
    };
    
    console.error('❌ Error details:', JSON.stringify(errorInfo, null, 2));
    
    return NextResponse.json(
      { 
        error: 'Test upload failed',
        details: process.env.NODE_ENV === 'development' ? errorInfo : undefined 
      },
      { status: 500 }
    );
  }
}

// Ensure this endpoint is not cached
export const dynamic = 'force-dynamic';
