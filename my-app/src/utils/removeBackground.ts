export async function removeBackground(file: File): Promise<Blob> {
    const { removeBackground: imglyRemoveBackground } = await import('@imgly/background-removal');
    
    // Convert File to base64 data URL
    const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
    
    // Process with @imgly/background-removal
    const result = await imglyRemoveBackground(base64, {
        output: {
            format: 'image/png',
            quality: 0.8
        }
    });
    
    // Convert result to Blob
    if (result instanceof Blob) {
        return result;
    } else if (typeof result === 'string') {
        // Convert base64 data URL to Blob
        const response = await fetch(result);
        return await response.blob();
    } else {
        throw new Error('Unexpected result format from background removal');
    }
}
  