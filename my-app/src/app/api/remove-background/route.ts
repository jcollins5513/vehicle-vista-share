import { NextRequest, NextResponse } from 'next/server';
import { writeFile, unlink, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Background removal API using nadermx/backgroundremover
 * This endpoint handles single image background removal using Python CLI
 */

export async function POST(request: NextRequest) {
  let inputPath: string | null = null;
  let outputPath: string | null = null;

  try {
    // Get the uploaded file
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'Only image files are supported' },
        { status: 400 }
      );
    }

    // Create temp directory if it doesn't exist
    const tempDir = path.join(process.cwd(), 'temp');
    if (!existsSync(tempDir)) {
      await mkdir(tempDir, { recursive: true });
    }

    // Generate unique filenames
    const timestamp = Date.now();
    const fileExtension = path.extname(file.name) || '.jpg';
    const filename = `input_${timestamp}${fileExtension}`;
    const outputFilename = `output_${timestamp}.png`;
    
    inputPath = path.join(tempDir, filename);
    outputPath = path.join(tempDir, outputFilename);

    // Save the uploaded file
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(inputPath, buffer);

    console.log(`🖼️ Processing image: ${filename}`);

    // Check if backgroundremover is installed
    try {
      await execAsync('backgroundremover --help');
    } catch (error) {
      console.error('❌ backgroundremover not installed');
      return NextResponse.json(
        { 
          error: 'Background remover not installed. Please install with: pip install backgroundremover',
          installInstructions: 'Run: pip install --upgrade pip && pip install backgroundremover'
        },
        { status: 500 }
      );
    }

    // Run background removal using nadermx/backgroundremover
    // Use u2net model for best results on vehicles
    const command = `backgroundremover -i "${inputPath}" -m "u2net" -o "${outputPath}"`;
    
    console.log(`🔄 Executing: ${command}`);
    
    const { stdout, stderr } = await execAsync(command, {
      timeout: 60000 // 60 second timeout
    });

    if (stderr && !stderr.includes('UserWarning')) {
      console.error('⚠️ Background remover stderr:', stderr);
    }

    console.log('✅ Background removal completed');

    // Check if output file was created
    if (!existsSync(outputPath)) {
      throw new Error('Output file was not created by background remover');
    }

    // Read the processed image
    const processedImage = await import('fs').then(fs => 
      fs.promises.readFile(outputPath)
    );

    // Clean up temp files
    await Promise.all([
      unlink(inputPath).catch(console.error),
      unlink(outputPath).catch(console.error)
    ]);

    // Return the processed image
    return new NextResponse(processedImage, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': `attachment; filename="processed_${file.name.replace(/\.[^/.]+$/, '.png')}"`,
        'X-Processing-Time': Date.now() - timestamp + 'ms',
        'X-Model-Used': 'u2net'
      },
    });

  } catch (error) {
    console.error('❌ Background removal error:', error);

    // Clean up temp files on error
    if (inputPath) await unlink(inputPath).catch(() => {});
    if (outputPath) await unlink(outputPath).catch(() => {});

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Specific error handling
    if (errorMessage.includes('timeout')) {
      return NextResponse.json(
        { error: 'Processing timeout. Image may be too large or complex.' },
        { status: 408 }
      );
    }

    if (errorMessage.includes('ENOENT') || errorMessage.includes('command not found')) {
      return NextResponse.json(
        { 
          error: 'Background remover not found. Please install nadermx/backgroundremover.',
          installInstructions: {
            pip: 'pip install --upgrade pip && pip install backgroundremover',
            conda: 'conda install -c conda-forge backgroundremover',
            requirements: 'python >= 3.6, pytorch, ffmpeg 4.4+'
          }
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: `Background removal failed: ${errorMessage}` },
      { status: 500 }
    );
  }
}

/**
 * Batch processing endpoint for multiple images
 */
export async function PUT(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    
    if (files.length === 0) {
      return NextResponse.json(
        { error: 'No files provided' },
        { status: 400 }
      );
    }

    if (files.length > 20) {
      return NextResponse.json(
        { error: 'Maximum 20 files can be processed at once' },
        { status: 400 }
      );
    }

    const results = [];
    const tempDir = path.join(process.cwd(), 'temp');
    
    if (!existsSync(tempDir)) {
      await mkdir(tempDir, { recursive: true });
    }

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const timestamp = Date.now() + i;
      
      try {
        // Process each file individually
        const singleFileFormData = new FormData();
        singleFileFormData.append('file', file);
        
        const singleRequest = new NextRequest(request.url, {
          method: 'POST',
          body: singleFileFormData
        });
        
        const result = await POST(singleRequest);
        
        if (result.ok) {
          const processedBuffer = await result.arrayBuffer();
          results.push({
            filename: file.name,
            success: true,
            data: Buffer.from(processedBuffer).toString('base64'),
            size: processedBuffer.byteLength
          });
        } else {
          const error = await result.json();
          results.push({
            filename: file.name,
            success: false,
            error: error.error
          });
        }
      } catch (error) {
        results.push({
          filename: file.name,
          success: false,
          error: error instanceof Error ? error.message : 'Processing failed'
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    
    return NextResponse.json({
      success: true,
      processed: successCount,
      total: files.length,
      results
    });

  } catch (error) {
    console.error('❌ Batch processing error:', error);
    return NextResponse.json(
      { error: 'Batch processing failed' },
      { status: 500 }
    );
  }
}

/**
 * Health check endpoint
 */
export async function GET() {
  try {
    // Check if backgroundremover is available
    await execAsync('backgroundremover --help');
    
    return NextResponse.json({
      status: 'healthy',
      service: 'nadermx/backgroundremover',
      models: ['u2net', 'u2netp', 'u2net_human_seg'],
      features: ['single_image', 'batch_processing', 'alpha_matting'],
      maxFiles: 20,
      supportedFormats: ['jpg', 'jpeg', 'png', 'webp']
    });
  } catch (error) {
    return NextResponse.json({
      status: 'unhealthy',
      error: 'backgroundremover not installed',
      installInstructions: 'pip install --upgrade pip && pip install backgroundremover'
    }, { status: 503 });
  }
}
