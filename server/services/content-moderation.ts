import { log } from "../vite";
import { type UploadApiResponse } from 'cloudinary';
import { uploadToCloudinary } from './cloudinary';
import { createRequire } from 'module';

// Initialize bad-words without top-level await
let filter: any;
let BadWords;
try {
  const require = createRequire(import.meta.url);
  BadWords = require('bad-words');
  filter = new BadWords();

  // Add custom words to the filter
  filter.addWords(
    'spam',
    'scam',
    'fraud',
    // Add more custom words as needed
  );
} catch (error) {
  log('Error initializing content filter:', error instanceof Error ? error.message : 'Unknown error');
  throw new Error('Failed to initialize content moderation');
}

export interface ModeratedContent {
  isAcceptable: boolean;
  filteredText?: string;
  moderationFlags?: string[];
}

/**
 * Moderate text content for profanity and inappropriate content
 */
export function moderateText(text: string): ModeratedContent {
  try {
    const containsProfanity = filter.isProfane(text);
    if (containsProfanity) {
      return {
        isAcceptable: false,
        moderationFlags: ['profanity']
      };
    }

    // Clean the text while preserving word boundaries
    const filteredText = filter.clean(text);

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
 * Enhanced image upload with moderation
 */
export async function uploadWithModeration(file: Express.Multer.File): Promise<UploadApiResponse> {
  try {
    const uploadResult = await uploadToCloudinary(file);

    // Check moderation status if available
    if (uploadResult.moderation && Array.isArray(uploadResult.moderation)) {
      const hasInappropriateContent = uploadResult.moderation.some(
        flag => ['violence', 'nudity', 'hate', 'drugs', 'spam'].includes(flag)
      );

      if (hasInappropriateContent) {
        throw new Error('Image contains inappropriate content');
      }
    }

    return uploadResult;
  } catch (error) {
    log('Error in image moderation:', error instanceof Error ? error.message : 'Unknown error');
    throw error;
  }
}