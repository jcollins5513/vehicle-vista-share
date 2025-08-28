// ONNX Runtime Web initialization utility
export async function initializeOnnxRuntime() {
  try {
    // Import onnxruntime-web to ensure it's loaded
    const onnx = await import('onnxruntime-web');
    
    // Set the WASM path if needed
    if (typeof window !== 'undefined' && onnx.env) {
      // Configure the WASM path for the public directory
      onnx.env.wasm.wasmPaths = '/';
    }
    
    console.log('ONNX Runtime Web initialized successfully');
    return true;
  } catch (error) {
    console.error('Failed to initialize ONNX Runtime Web:', error);
    return false;
  }
}

// Check if ONNX Runtime is available
export function isOnnxRuntimeAvailable(): boolean {
  return typeof window !== 'undefined' && 'onnxruntime' in window;
}

// Get ONNX Runtime version
export async function getOnnxRuntimeVersion(): Promise<string | null> {
  try {
    const onnx = await import('onnxruntime-web');
    return onnx.version || 'unknown';
  } catch (error) {
    console.error('Failed to get ONNX Runtime version:', error);
    return null;
  }
}
