export async function removeBackground(file: File): Promise<Blob> {
    const form = new FormData();
    form.append("file", file);

    // Use the new local background removal API with nadermx/backgroundremover
    const response = await fetch("/api/remove-background", {
      method: "POST",
      body: form,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));

      if (response.status === 503) {
        throw new Error(`Background remover not installed: ${errorData.error || 'Service unavailable'}\n\nInstall with: ${errorData.installInstructions || 'pip install backgroundremover'}`);
      }

      throw new Error(errorData.error || `Background removal failed with status ${response.status}`);
    }

    return await response.blob();
  }

/**
 * Process multiple files at once using batch endpoint
 */
export async function removeBackgroundBatch(files: File[]): Promise<{
  success: boolean;
  processed: number;
  total: number;
  results: Array<{
    filename: string;
    success: boolean;
    data?: string; // base64 encoded
    error?: string;
  }>;
}> {
  const form = new FormData();
  files.forEach(file => form.append("files", file));

  const response = await fetch("/api/remove-background", {
    method: "PUT",
    body: form,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Batch processing failed with status ${response.status}`);
  }

  return await response.json();
}

/**
 * Check if the background removal service is available
 */
export async function checkBackgroundRemovalHealth(): Promise<{
  available: boolean;
  service?: string;
  error?: string;
  installInstructions?: string;
}> {
  try {
    const response = await fetch("/api/remove-background", {
      method: "GET",
    });

    if (response.ok) {
      const data = await response.json();
      return {
        available: true,
        service: data.service,
      };
    } else {
      const errorData = await response.json().catch(() => ({}));
      return {
        available: false,
        error: errorData.error,
        installInstructions: errorData.installInstructions,
      };
    }
  } catch (error) {
    return {
      available: false,
      error: error instanceof Error ? error.message : 'Service check failed',
    };
  }
}
