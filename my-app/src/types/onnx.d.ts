declare module 'onnxruntime-web' {
  export interface OnnxRuntimeWeb {
    env: {
      wasm: {
        wasmPaths: string;
        numThreads?: number;
        simd?: boolean;
      };
    };
    version?: string;
  }

  const onnx: OnnxRuntimeWeb;
  export default onnx;
}

// Also declare it as a global for browser usage
declare global {
  interface Window {
    onnxruntime: any;
  }
}
