import { log } from "../vite";
import { type UploadApiResponse } from 'cloudinary';
import { uploadToCloudinary } from './cloudinary';
import OpenAI from 'openai';

if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY environment variable must be set');
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export interface ModeratedContent {
  isAcceptable: boolean;
  moderationFlags?: string[];
  message?: string;
}

/**
 * Moderate text content using OpenAI's moderation API
 */
export async function moderateText(text: string): Promise<ModeratedContent> {
  try {
    log('Moderating text content using OpenAI');
    const response = await openai.moderations.create({ input: text });

    const result = response.results[0];
    const flagged = result.flagged;

    // Get all categories that were flagged
    const flaggedCategories = Object.entries(result.categories)
      .filter(([_, flagged]) => flagged)
      .map(([category]) => category);

    return {
      isAcceptable: !flagged,
      moderationFlags: flaggedCategories,
      message: flagged ? 'Content contains inappropriate material' : undefined
    };
  } catch (error) {
    log('Error in text moderation:', error instanceof Error ? error.message : 'Unknown error');
    throw error;
  }
}

/**
 * Check if an image might contain inappropriate content using OpenAI's vision API
 */
async function checkImageContent(imageUrl: string): Promise<ModeratedContent> {
  try {
    log('Analyzing image content using OpenAI Vision');

    const response = await openai.chat.completions.create({
      model: "gpt-4-vision-preview",
      messages: [
        {
          role: "user",
          content: [
            { 
              type: "text", 
              text: "Analyze this image and determine if it contains any inappropriate, offensive, or adult content. Only respond with 'ACCEPTABLE' or 'INAPPROPRIATE: [reason]'." 
            },
            {
              type: "image_url",
              url: imageUrl,
            }
          ],
        }
      ],
      max_tokens: 50
    });

    const analysis = response.choices[0]?.message?.content || '';
    const isAcceptable = analysis.startsWith('ACCEPTABLE');

    return {
      isAcceptable,
      message: !isAcceptable ? analysis.replace('INAPPROPRIATE: ', '') : undefined,
      moderationFlags: !isAcceptable ? ['inappropriate_image'] : undefined
    };
  } catch (error) {
    log('Error in image content analysis:', error instanceof Error ? error.message : 'Unknown error');
    throw error;
  }
}

/**
 * Enhanced image upload with OpenAI-based moderation
 */
export async function uploadWithModeration(file: Express.Multer.File): Promise<UploadApiResponse> {
  try {
    // First upload to Cloudinary to get the URL
    const uploadResult = await uploadToCloudinary(file);

    // Then check the image content
    const moderationResult = await checkImageContent(uploadResult.secure_url);

    if (!moderationResult.isAcceptable) {
      // If content is inappropriate, delete from Cloudinary
      // Note: Add Cloudinary deletion here if needed
      throw new Error(moderationResult.message || 'Image contains inappropriate content');
    }

    return uploadResult;
  } catch (error) {
    log('Error in image moderation:', error instanceof Error ? error.message : 'Unknown error');
    throw error;
  }
}