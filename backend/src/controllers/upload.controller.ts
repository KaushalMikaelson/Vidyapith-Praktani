import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.js';
import { uploadToCloudinary, UploadFolder } from '../services/upload.service.js';

/**
 * POST /api/v1/upload
 * Accepts a single file via multipart/form-data (field name: "file").
 * Optional query param: ?folder=posts/images | posts/videos | profiles
 * Returns: { url, publicId, format, bytes }
 */
export const uploadMedia = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No file provided. Send a file under the "file" field.' });
      return;
    }

    const folder = (req.query.folder as UploadFolder | undefined) ?? 'posts/images';
    const validFolders: UploadFolder[] = ['posts/images', 'posts/videos', 'profiles'];
    if (!validFolders.includes(folder)) {
      res.status(400).json({ error: `Invalid folder. Must be one of: ${validFolders.join(', ')}` });
      return;
    }

    const result = await uploadToCloudinary(req.file.buffer, req.file.mimetype, folder);

    res.status(200).json({
      url:      result.url,
      publicId: result.publicId,
      format:   result.format,
      bytes:    result.bytes,
      width:    result.width,
      height:   result.height,
      duration: result.duration,
    });
  } catch (err: any) {
    console.error('[Upload Controller Error]', err);
    res.status(500).json({ error: err.message || 'Upload failed. Please try again.' });
  }
};
