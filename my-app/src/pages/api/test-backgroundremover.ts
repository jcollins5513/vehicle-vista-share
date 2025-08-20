import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { spawn } = require('child_process');
    const os = require('os');
    
    // Test if backgroundremover is available
    return new Promise((resolve) => {
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
      
      const process = spawn('backgroundremover', ['--help'], spawnOptions);
      
      let stdout = '';
      let stderr = '';
      
      process.stdout.on('data', (data: Buffer) => {
        stdout += data.toString();
      });
      
      process.stderr.on('data', (data: Buffer) => {
        stderr += data.toString();
      });
      
      process.on('close', (code: number) => {
        resolve(res.status(200).json({
          success: code === 0,
          platform: process.platform,
          tempDir: os.tmpdir(),
          exitCode: code,
          stdout: stdout.substring(0, 500), // Limit output
          stderr: stderr.substring(0, 500),
          message: code === 0 
            ? 'backgroundremover is installed and working' 
            : 'backgroundremover failed or not installed'
        }));
      });
      
      process.on('error', (error: Error) => {
        resolve(res.status(200).json({
          success: false,
          platform: process.platform,
          tempDir: os.tmpdir(),
          error: error.message,
          message: 'backgroundremover command not found. Please install it using: pip install backgroundremover'
        }));
      });
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Failed to test backgroundremover installation'
    });
  }
}