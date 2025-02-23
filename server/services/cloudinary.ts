import { v2 as cloudinary } from 'cloudinary';
import { log } from "../vite";
import type { UploadApiResponse, UploadApiErrorResponse } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Uploads a file to Cloudinary
 * @param file The file buffer to upload
 * @returns Promise resolving to the Cloudinary upload response
 */
export async function uploadToCloudinary(file: Express.Multer.File): Promise<UploadApiResponse> {
  try {
    log('Attempting to upload file to Cloudinary');

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'social-feed',
          resource_type: 'auto',
        },
        (error: UploadApiErrorResponse | null, result: UploadApiResponse | undefined) => {
          if (error || !result) {
            log('Cloudinary upload error:', error?.message || 'Unknown error');
            reject(error || new Error('Upload failed'));
          } else {
            log('Cloudinary upload successful:', result.secure_url);
            resolve(result);
          }
        }
      );

      uploadStream.end(file.buffer);
    });
  } catch (error) {
    log('Error in uploadToCloudinary:', error instanceof Error ? error.message : 'Unknown error');
    throw error;
  }
}