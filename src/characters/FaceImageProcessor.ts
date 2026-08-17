export type FaceIdentity = 'makar' | 'mama' | 'papa';

export interface FaceRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FaceCrop {
  x: number;
  y: number;
  width: number;
  height: number;
  detected: boolean;
}

export interface NormalizedFaceImage {
  dataUrl: string;
  crop: FaceCrop;
  detected: boolean;
  width: number;
  height: number;
}

export const NORMALIZED_FACE_WIDTH = 512;
export const NORMALIZED_FACE_HEIGHT = 640;
const TARGET_ASPECT = NORMALIZED_FACE_WIDTH / NORMALIZED_FACE_HEIGHT;

interface FaceProfile {
  faceHeightScale: number;
  faceWidthShare: number;
  detectedCenterYBias: number;
  fallbackCenterY: number;
}

const FACE_PROFILES: Record<FaceIdentity, FaceProfile> = {
  makar: { faceHeightScale: 1.70, faceWidthShare: 0.68, detectedCenterYBias: -0.06, fallbackCenterY: 0.46 },
  mama: { faceHeightScale: 1.78, faceWidthShare: 0.66, detectedCenterYBias: -0.08, fallbackCenterY: 0.45 },
  papa: { faceHeightScale: 1.68, faceWidthShare: 0.69, detectedCenterYBias: -0.05, fallbackCenterY: 0.47 },
};

/**
 * Pure crop policy used by both browser processing and unit tests.
 * The output always preserves the 4:5 texture aspect expected by CharacterModel.
 */
export function resolveFaceCrop(
  imageWidth: number,
  imageHeight: number,
  face: FaceRect | null,
  identity: FaceIdentity = 'makar'
): FaceCrop {
  const width = Math.max(1, imageWidth);
  const height = Math.max(1, imageHeight);
  const profile = FACE_PROFILES[identity];

  if (face && isUsefulFace(face, width, height)) {
    const safeFace = clampRect(face, width, height);
    const targetHeightFromFaceHeight = safeFace.height * profile.faceHeightScale;
    const targetWidthFromFaceWidth = safeFace.width / profile.faceWidthShare;
    const targetHeightFromFaceWidth = targetWidthFromFaceWidth / TARGET_ASPECT;
    const targetHeight = Math.max(targetHeightFromFaceHeight, targetHeightFromFaceWidth);
    const centerX = safeFace.x + safeFace.width * 0.5;
    const centerY = safeFace.y + safeFace.height * (0.5 + profile.detectedCenterYBias);
    return fitAspectCrop(width, height, centerX, centerY, targetHeight, true);
  }

  // Portable fallback for browsers without Shape Detection API. Prefer most of the
  // source image, but bias a 4:5 portrait crop slightly upward where faces normally sit.
  const sourceAspect = width / height;
  let cropHeight: number;
  if (sourceAspect >= TARGET_ASPECT) {
    cropHeight = height * 0.96;
  } else {
    const cropWidth = width * 0.96;
    cropHeight = cropWidth / TARGET_ASPECT;
  }
  return fitAspectCrop(width, height, width * 0.5, height * profile.fallbackCenterY, cropHeight, false);
}

export async function normalizeFaceDataUrl(
  dataUrl: string,
  identity: FaceIdentity = 'makar'
): Promise<NormalizedFaceImage> {
  const image = await loadImage(dataUrl);
  const detectedFace = await detectLargestFace(image);
  const crop = resolveFaceCrop(image.naturalWidth, image.naturalHeight, detectedFace, identity);

  const canvas = document.createElement('canvas');
  canvas.width = NORMALIZED_FACE_WIDTH;
  canvas.height = NORMALIZED_FACE_HEIGHT;
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('Canvas 2D is unavailable for face normalization');

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(
    image,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    canvas.width,
    canvas.height
  );

  // JPEG keeps localStorage bounded even when the original phone photo was 8–12 MB.
  // 0.92 is visually lossless at the small in-game face-shell size.
  const normalized = canvas.toDataURL('image/jpeg', 0.92);
  return {
    dataUrl: normalized,
    crop,
    detected: crop.detected,
    width: canvas.width,
    height: canvas.height,
  };
}

function fitAspectCrop(
  imageWidth: number,
  imageHeight: number,
  centerX: number,
  centerY: number,
  requestedHeight: number,
  detected: boolean
): FaceCrop {
  let height = Math.max(1, requestedHeight);
  let width = height * TARGET_ASPECT;

  if (width > imageWidth) {
    width = imageWidth;
    height = width / TARGET_ASPECT;
  }
  if (height > imageHeight) {
    height = imageHeight;
    width = height * TARGET_ASPECT;
  }

  const x = clamp(centerX - width * 0.5, 0, imageWidth - width);
  const y = clamp(centerY - height * 0.5, 0, imageHeight - height);
  return { x, y, width, height, detected };
}

function clampRect(rect: FaceRect, imageWidth: number, imageHeight: number): FaceRect {
  const x = clamp(rect.x, 0, imageWidth - 1);
  const y = clamp(rect.y, 0, imageHeight - 1);
  const width = clamp(rect.width, 1, imageWidth - x);
  const height = clamp(rect.height, 1, imageHeight - y);
  return { x, y, width, height };
}

function isUsefulFace(face: FaceRect, imageWidth: number, imageHeight: number): boolean {
  if (![face.x, face.y, face.width, face.height].every(Number.isFinite)) return false;
  if (face.width <= 2 || face.height <= 2) return false;
  return (face.width * face.height) / (imageWidth * imageHeight) >= 0.01;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

async function detectLargestFace(image: HTMLImageElement): Promise<FaceRect | null> {
  const FaceDetectorCtor = (globalThis as unknown as {
    FaceDetector?: new (options?: { fastMode?: boolean; maxDetectedFaces?: number }) => {
      detect(source: CanvasImageSource): Promise<Array<{ boundingBox: FaceRect }>>;
    };
  }).FaceDetector;
  if (!FaceDetectorCtor) return null;

  let bitmap: ImageBitmap | null = null;
  try {
    const detector = new FaceDetectorCtor({ fastMode: true, maxDetectedFaces: 4 });
    const source: CanvasImageSource = typeof createImageBitmap === 'function'
      ? (bitmap = await createImageBitmap(image))
      : image;
    const faces = await detector.detect(source);
    let best: FaceRect | null = null;
    let bestArea = 0;
    for (const candidate of faces) {
      const box = candidate?.boundingBox;
      if (!box) continue;
      const rect = { x: box.x, y: box.y, width: box.width, height: box.height };
      const area = rect.width * rect.height;
      if (area > bestArea) {
        best = rect;
        bestArea = area;
      }
    }
    return best;
  } catch {
    // FaceDetector is optional/experimental. Failure must never block local photo upload.
    return null;
  } finally {
    bitmap?.close();
  }
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Не удалось подготовить фотографию'));
    image.src = dataUrl;
  });
}
