import { v2 as cloudinary } from 'cloudinary';
import { log } from "../vite";
import type { UploadApiResponse } from 'cloudinary';
import type { File } from 'multer';

// Configure Cloudinary with required environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Uploads a file to Cloudinary with proper error handling and logging
 * @param file The file from multer to upload
 * @returns Promise resolving to the Cloudinary upload response
 */
export async function uploadToCloudinary(file: Express.Multer.File): Promise<UploadApiResponse> {
  try {
    log('Initiating file upload to Cloudinary');
    log(`File details: ${file.originalname}, ${file.mimetype}, ${file.size} bytes`);

    const uploadPromise = new Promise<UploadApiResponse>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'social-feed',
          resource_type: 'auto',
          transformation: [
            { width: 1200, height: 1200, crop: 'limit' },
            { quality: 'auto:good' }
          ]
        },
        (error, result) => {
          if (error || !result) {
            log('Cloudinary upload error:', error?.message || 'Unknown error');
            reject(error || new Error('Upload failed'));
          } else {
            log('Cloudinary upload successful:', result.secure_url);
            resolve(result);
          }
        }
      );

      // Handle potential stream errors
      uploadStream.on('error', (error) => {
        log('Upload stream error:', error);
        reject(error);
      });

      // Write file buffer to stream
      uploadStream.end(file.buffer);
    });

    return await uploadPromise;
  } catch (error) {
    log('Error in uploadToCloudinary:', error instanceof Error ? error.message : 'Unknown error');
    throw error;
  }
}