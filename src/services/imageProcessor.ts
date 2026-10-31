/**
 * Image Processor Pipeline
 * 
 * Maqsad:
 * 1. 18MB ki bari camera photo ko compress karke 5MB ceiling ke andar lana.
 * 2. 2G network par bari files bhejna impossible hota hai, isliye image ko optimize karna
 *    taake photo saaf (high resolution) bhi rahe aur jaldi deliver ho jaye.
 * 3. App UI freeze na ho (background async processing).
 */

import ImageResizer from '@bam.tech/react-native-image-resizer';
import { LocalImage } from '../types/report';

// 5MB Hard Ceiling (Bytes me: 5,242,880 bytes)
export const MAX_ALLOWED_BYTES = 5 * 1024 * 1024;

// Target dimensions for high quality inspection photos
const TARGET_MAX_WIDTH = 2048;
const TARGET_MAX_HEIGHT = 2048;
const JPEG_QUALITY = 80; // 80% quality retains great clarity while cutting 80%+ file size

/**
 * Ek single image ko process/compress karna
 */
export async function processSingleImage(image: LocalImage): Promise<LocalImage> {
  try {
    // Agar image pehle se compress ho chuki hai aur 5MB se choti hai, toh dubara karne ki zaroorat nahi
    if (image.isCompressed && image.fileSizeBytes < MAX_ALLOWED_BYTES) {
      return image;
    }

    console.log(`[IMAGE PIPELINE] Compressing photo: ${image.uri} (Original: ${(image.fileSizeBytes / (1024 * 1024)).toFixed(2)} MB)`);

    // @bam.tech/react-native-image-resizer call
    const resized = await ImageResizer.createResizedImage(
      image.uri,
      TARGET_MAX_WIDTH,
      TARGET_MAX_HEIGHT,
      'JPEG',
      JPEG_QUALITY,
      0, // rotation
      undefined, // outputPath (default cache directory)
      false, // keepExif
      { mode: 'contain', onlyScaleDown: true } // Sirf scale down karein agar image bari ho
    );

    console.log(
      `[IMAGE PIPELINE] Compression complete! New size: ${(resized.size / (1024 * 1024)).toFixed(2)} MB (${resized.size} bytes)`
    );

    return {
      ...image,
      uri: resized.uri,
      fileSizeBytes: resized.size,
      width: resized.width,
      height: resized.height,
      isCompressed: true,
    };
  } catch (error) {
    console.error(`[IMAGE PIPELINE] Failed to compress image ${image.uri}:`, error);
    // Agar resize fail ho jaye, original return karein (lekin log error)
    return image;
  }
}

/**
 * Report ki tamam images ko ek ek karke compress karna
 */
export async function processReportImages(images: LocalImage[]): Promise<LocalImage[]> {
  const processedImages: LocalImage[] = [];

  for (const img of images) {
    const processed = await processSingleImage(img);
    processedImages.push(processed);
  }

  return processedImages;
}

