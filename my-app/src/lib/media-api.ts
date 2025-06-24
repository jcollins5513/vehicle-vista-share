/**
 * Media API utility functions for interacting with the media endpoints
 */

/**
 * Reorders media items by sending the new order to the API
 * @param mediaItems Array of media items with their new order
 * @returns Promise that resolves when the reorder is complete
 */
export async function reorderMedia(mediaIds: string[]): Promise<boolean> {
  try {
    const response = await fetch('/api/media/reorder', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ mediaIds }),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to reorder media: ${response.statusText}`);
    }
    
    return true;
  } catch (error) {
    console.error('Error reordering media:', error);
    return false;
  }
}

export async function deleteMedia(mediaId: string): Promise<boolean> {
  try {
    const response = await fetch(`/api/media/${mediaId}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      throw new Error(`Failed to delete media: ${response.statusText}`);
    }
    
    return true;
  } catch (error) {
    console.error('Error deleting media:', error);
    return false;
  }
}
