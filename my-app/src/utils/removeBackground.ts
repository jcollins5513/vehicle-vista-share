export async function removeBackground(file: File): Promise<Blob> {
    const form = new FormData();
    form.append("file", file);
  
    const response = await fetch("https://jcs-build.tail587e44.ts.net/remove-background", {
      method: "POST",
      body: form,
    });
  
    if (!response.ok) throw new Error("Background removal failed");
  
    return await response.blob();
  }
  