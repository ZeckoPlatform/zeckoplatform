import { log } from "../vite";
import { type UploadApiResponse } from 'cloudinary';
import { uploadToCloudinary } from './cloudinary';
import { Filter } from 'bad-words';

const filter = new Filter();

// Add custom business-related spam words
filter.addWords(
  'spam',
  'scam',
  'fraud',
  'free money',
  'get rich quick',
  'make money fast',
  'investment opportunity'
);

export interface ModeratedContent {
  isAcceptable: boolean;
  filteredText?: string;
  moderationFlags?: string[];
  message?: string;
}

/**
 * Moderate text content for profanity and inappropriate content
 */
export function moderateText(text: string): ModeratedContent {
  try {
    const containsProfanity = filter.isProfane(text);

    // Clean the text while preserving word boundaries
    const filteredText = filter.clean(text);

    if (containsProfanity) {
      return {
        isAcceptable: false,
        moderationFlags: ['profanity'],
        message: 'Your post contains inappropriate language'
      };
    }

    return {
      isAcceptable: true,
      filteredText
    };
  } catch (error) {
    log('Error in text moderation:', error instanceof Error ? error.message : 'Unknown error');
    throw error;
  }
}

/**
 * Enhanced image upload with basic moderation
 */
export async function uploadWithModeration(file: Express.Multer.File): Promise<UploadApiResponse> {
  try {
    // Upload to Cloudinary with moderation
    const uploadResult = await uploadToCloudinary(file);

    // Simple file type and size validation
    if (!file.mimetype.startsWith('image/')) {
      throw new Error('Only image files are allowed');
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      throw new Error('Image size exceeds 5MB limit');
    }

    return uploadResult;
  } catch (error) {
    log('Error in image moderation:', error instanceof Error ? error.message : 'Unknown error');
    throw error;
  }
}