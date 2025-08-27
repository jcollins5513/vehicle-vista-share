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

// Alternative simple background removal using canvas (fallback)
export async function simpleBackgroundRemoval(file: File): Promise<Blob> {
    return new Promise((resolve, reject) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            reject(new Error('Canvas context not available'));
            return;
        }

        const img = new Image();
        img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;
            
            // Draw the image
            ctx.drawImage(img, 0, 0);
            
            // Get image data for processing
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            
            // Simple background removal: make white/light pixels transparent
            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                
                // Calculate brightness
                const brightness = (r + g + b) / 3;
                
                // If pixel is very light (close to white), make it transparent
                if (brightness > 240) {
                    data[i + 3] = 0; // Set alpha to 0 (transparent)
                }
            }
            
            // Put the processed image data back
            ctx.putImageData(imageData, 0, 0);
            
            // Convert to blob
            canvas.toBlob((blob) => {
                if (blob) {
                    resolve(blob);
                } else {
                    reject(new Error('Failed to create blob from canvas'));
                }
            }, 'image/png');
        };
        
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = URL.createObjectURL(file);
    });
}
  