import { cloudinary } from '../config/cloudinary.js';

/**
 * Cloudinary folder strategy:
 *   vidyapith/posts/images  — photo posts
 *   vidyapith/posts/videos  — video posts
 *   vidyapith/profiles      — profile photos
 */
export type UploadFolder = 'posts/images' | 'posts/videos' | 'profiles' | 'certificates';

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
  const resourceType = mimeType.startsWith('video/')
    ? 'video'
    : mimeType === 'application/pdf'
      ? 'raw'
      : 'image';

  // ── Local Demo Mode ───────────────────────────────────────────────────────
  // If Cloudinary credentials are not set, skip the real upload and return
  // a placeholder so local development works without any env vars.
  const isLocalDemo = !process.env.CLOUDINARY_CLOUD_NAME ||
                      !process.env.CLOUDINARY_API_KEY    ||
                      !process.env.CLOUDINARY_API_SECRET;

  if (isLocalDemo) {
    console.warn(`[Upload] ⚠️  Cloudinary env vars not set — using local demo placeholder for "${folder}".`);
    const demoUrls: Record<UploadFolder, string> = {
      'posts/images':  'https://images.unsplash.com/photo-1588345921523-c2dcdb7f1dcd?w=800&q=80',
      'posts/videos':  'https://www.w3schools.com/html/mov_bbb.mp4',
      'profiles':      'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop&q=80',
      'certificates':  'https://upload.wikimedia.org/wikipedia/commons/a/a7/Camponotus_flavomarginatus_ant.jpg',
    };
    return Promise.resolve({
      url:      demoUrls[folder],
      publicId: `demo/${folder}/local-placeholder`,
      format:   resourceType === 'raw' ? 'pdf' : resourceType === 'video' ? 'mp4' : 'jpg',
      bytes:    buffer.length,
      width:    resourceType === 'image' ? 800 : undefined,
      height:   resourceType === 'image' ? 600 : undefined,
    });
  }
  // ─────────────────────────────────────────────────────────────────────────

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder:        `vidyapith/${folder}`,
        resource_type: resourceType,
        // Auto-generate optimised formats (WebP for images only)
        eager: resourceType === 'image'
          ? [{ fetch_format: 'auto', quality: 'auto' }]
          : undefined,
        // Image quality/size transformations (not applicable for video or raw/PDF)
        transformation: resourceType === 'image'
          ? [{ width: 2000, crop: 'limit', quality: 'auto', fetch_format: 'auto' }]
          : undefined,
        // Ensure raw files (PDFs) are accessible via secure URL
        ...(resourceType === 'raw' ? { use_filename: true, unique_filename: true } : {}),
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
