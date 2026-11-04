import ImageResizer from '@bam.tech/react-native-image-resizer';
import { LocalImage } from '../types/report';

export const MAX_ALLOWED_BYTES = 5 * 1024 * 1024; // 5MB destination ceiling
const TARGET_MAX_WIDTH = 2048;
const TARGET_MAX_HEIGHT = 2048;
const JPEG_QUALITY = 80;

export async function processSingleImage(image: LocalImage): Promise<LocalImage> {
  try {
    if (image.isCompressed && image.fileSizeBytes < MAX_ALLOWED_BYTES) {
      return image;
    }

    const resized = await ImageResizer.createResizedImage(
      image.uri,
      TARGET_MAX_WIDTH,
      TARGET_MAX_HEIGHT,
      'JPEG',
      JPEG_QUALITY,
      0,
      undefined,
      false,
      { mode: 'contain', onlyScaleDown: true }
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
    console.error(`[IMAGE] Failed to resize image ${image.uri}:`, error);
    return image;
  }
}

export async function processReportImages(images: LocalImage[]): Promise<LocalImage[]> {
  const processedImages: LocalImage[] = [];

  for (const img of images) {
    const processed = await processSingleImage(img);
    processedImages.push(processed);
  }

  return processedImages;
}
