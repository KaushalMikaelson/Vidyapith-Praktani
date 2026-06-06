import { cloudinary } from '../config/cloudinary.js';

/**
 * Cloudinary folder strategy:
 *   vidyapith/posts/images  — photo posts
 *   vidyapith/posts/videos  — video posts
 *   vidyapith/profiles      — profile photos
 */
export type UploadFolder = 'posts/images' | 'posts/videos' | 'profiles';

export interface UploadResult {
  url:       string;   // https://res.cloudinary.com/...
  publicId:  string;   // e.g. vidyapith/posts/images/abcd1234
  width?:    number;
  height?:   number;
  format:    string;
  bytes:     number;
  duration?: number;   // video only, in seconds
}

/**
 * Streams a file Buffer to Cloudinary.
 * @param buffer   Raw file data from multer memoryStorage
 * @param mimeType MIME type string (e.g. "image/jpeg")
 * @param folder   Destination folder inside the Cloudinary account
 */
export const uploadToCloudinary = (
  buffer: Buffer,
  mimeType: string,
  folder: UploadFolder = 'posts/images'
): Promise<UploadResult> => {
  const resourceType = mimeType.startsWith('video/') ? 'video' : 'image';

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder:        `vidyapith/${folder}`,
        resource_type: resourceType,
        // Auto-generate optimised formats (WebP for images, etc.)
        eager: resourceType === 'image'
          ? [{ fetch_format: 'auto', quality: 'auto' }]
          : undefined,
        // Reasonable quality / transformation defaults
        transformation: resourceType === 'image'
          ? [{ width: 2000, crop: 'limit', quality: 'auto', fetch_format: 'auto' }]
          : undefined,
      },
      (error, result) => {
        if (error || !result) return reject(error ?? new Error('Cloudinary upload failed'));
        resolve({
          url:      result.secure_url,
          publicId: result.public_id,
          width:    result.width,
          height:   result.height,
          format:   result.format,
          bytes:    result.bytes,
          duration: result.duration,
        });
      }
    );
    stream.end(buffer);
  });
};
