import { apiUploadFetch } from './api';

export type MediaFolder = 'posts/images' | 'posts/videos' | 'profiles';

export interface UploadedMedia {
  url:      string;
  publicId: string;
  format:   string;
  bytes:    number;
  width?:   number;
  height?:  number;
  duration?: number;
}

/**
 * Upload a single File to Cloudinary via the backend upload endpoint.
 * Returns the resulting Cloudinary secure URL.
 *
 * @param file   The browser File object (from <input type="file"> or drag-drop)
 * @param folder Destination folder in Cloudinary
 */
export const uploadMedia = async (
  file: File,
  folder: MediaFolder = 'posts/images'
): Promise<UploadedMedia> => {
  const formData = new FormData();
  formData.append('file', file);

  const result = await apiUploadFetch(`/upload?folder=${encodeURIComponent(folder)}`, formData);
  return result as UploadedMedia;
};

/**
 * Upload multiple image files in parallel.
 * Returns an array of Cloudinary URLs in the same order.
 */
export const uploadImages = async (
  files: File[],
  onProgress?: (done: number, total: number) => void
): Promise<string[]> => {
  const urls: string[] = [];
  let done = 0;

  // Upload sequentially to avoid hammering the backend
  for (const file of files) {
    const result = await uploadMedia(file, 'posts/images');
    urls.push(result.url);
    done++;
    onProgress?.(done, files.length);
  }

  return urls;
};
