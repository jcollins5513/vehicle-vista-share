import { NextApiRequest, NextApiResponse } from 'next';

interface TestResult {
  success: boolean;
  exitCode?: number;
  stdout?: string;
  stderr?: string;
  error?: string;
  inputExists: boolean;
  outputExists: boolean;
  inputPath: string;
  outputPath: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { imageUrl } = req.body;
    
    if (!imageUrl) {
      return res.status(400).json({ error: 'imageUrl is required' });
    }

    const os = require('os');
    const path = require('path');
    const fs = require('fs').promises;
    const { spawn } = require('child_process');

    // Download the image
    console.log(`Testing image processing for: ${imageUrl}`);
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.statusText}`);
    }

    const imageBuffer = await response.arrayBuffer();
    console.log(`Downloaded image, size: ${imageBuffer.byteLength} bytes`);

    // Create temp files
    const tempDir = os.tmpdir();
    const inputPath = path.join(tempDir, `test_input_${Date.now()}.jpg`);
    const outputPath = path.join(tempDir, `test_output_${Date.now()}.png`);

    // Save input file
    await fs.writeFile(inputPath, Buffer.from(imageBuffer));
    console.log(`Saved test input to: ${inputPath}`);

    // Test backgroundremover
    const testResult = await new Promise<TestResult>((resolve) => {
      const isWindows = process.platform === 'win32';
      const spawnOptions = isWindows ? { 
        shell: true,
        env: { 
          ...process.env, 
          KMP_DUPLICATE_LIB_OK: 'TRUE',
          OMP_NUM_THREADS: '1'
        }
      } : {
        env: { 
          ...process.env, 
          KMP_DUPLICATE_LIB_OK: 'TRUE',
          OMP_NUM_THREADS: '1'
        }
      };
      
      const childProcess = spawn('backgroundremover', ['-i', inputPath, '-o', outputPath], spawnOptions);
      
      let stdout = '';
      let stderr = '';
      
      childProcess.stdout.on('data', (data: Buffer) => {
        stdout += data.toString();
      });
      
      childProcess.stderr.on('data', (data: Buffer) => {
        stderr += data.toString();
      });
      
      childProcess.on('close', (code: number) => {
        resolve({
          success: code === 0,
          exitCode: code,
          stdout,
          stderr,
          inputExists: require('fs').existsSync(inputPath),
          outputExists: require('fs').existsSync(outputPath),
          inputPath,
          outputPath
        });
      });
      
      childProcess.on('error', (error: Error) => {
        resolve({
          success: false,
          error: error.message,
          inputExists: require('fs').existsSync(inputPath),
          outputExists: false,
          inputPath,
          outputPath
        });
      });

      // Timeout after 30 seconds for testing
      setTimeout(() => {
        childProcess.kill();
        resolve({
          success: false,
          error: 'Process timed out',
          inputExists: require('fs').existsSync(inputPath),
          outputExists: require('fs').existsSync(outputPath),
          inputPath,
          outputPath
        });
      }, 30000);
    });

    // Clean up files
    try {
      await fs.unlink(inputPath);
      if (require('fs').existsSync(outputPath)) {
        await fs.unlink(outputPath);
      }
    } catch (cleanupError) {
      console.warn('Cleanup error:', cleanupError);
    }

    return res.status(200).json({
      success: true,
      testResult,
      message: testResult.success 
        ? 'Background removal test completed successfully' 
        : 'Background removal test failed'
    });

  } catch (error) {
    console.error('Test image processing error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Failed to test image processing'
    });
  }
}