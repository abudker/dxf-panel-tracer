import exifr from 'exifr';
import { useAppStore } from '../store/useAppStore';
import { calculateContainFit } from '../utils/coordinates';

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

async function correctOrientation(file: File): Promise<{ url: string; width: number; height: number }> {
  const orientation = (await exifr.orientation(file)) ?? 1;

  // Orientation 1 (or undefined): no rotation needed — fast path
  if (orientation === 1 || !orientation) {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.src = url;
    await new Promise<void>((res) => {
      img.onload = () => res();
    });
    return { url, width: img.naturalWidth, height: img.naturalHeight };
  }

  // Load the original image for drawing
  const srcUrl = URL.createObjectURL(file);
  const img = new Image();
  img.src = srcUrl;
  await new Promise<void>((res) => {
    img.onload = () => res();
  });

  // Orientation 6 = 90° CW (most common for portrait phones)
  // Orientation 3 = 180°
  // Orientation 8 = 270° CW
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;

  const swap = orientation === 6 || orientation === 8;
  canvas.width = swap ? img.height : img.width;
  canvas.height = swap ? img.width : img.height;

  ctx.save();
  if (orientation === 3) {
    ctx.translate(canvas.width, canvas.height);
    ctx.rotate(Math.PI);
  } else if (orientation === 6) {
    ctx.translate(canvas.width, 0);
    ctx.rotate(Math.PI / 2);
  } else if (orientation === 8) {
    ctx.translate(0, canvas.height);
    ctx.rotate(-Math.PI / 2);
  }
  ctx.drawImage(img, 0, 0);
  ctx.restore();

  // Revoke the intermediate URL
  URL.revokeObjectURL(srcUrl);

  const correctedUrl = await new Promise<string>((resolve) => {
    canvas.toBlob((blob) => {
      resolve(URL.createObjectURL(blob!));
    }, 'image/jpeg', 0.95);
  });

  return { url: correctedUrl, width: canvas.width, height: canvas.height };
}

export function usePhotoUpload() {
  const handlePhotoFile = async (file: File) => {
    // Validate file type
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return;
    }

    const { url, width, height } = await correctOrientation(file);

    const { setPhotoUrl, setPhotoSize, setViewport } = useAppStore.getState();

    setPhotoUrl(url);
    setPhotoSize({ width, height });

    const fit = calculateContainFit(width, height, window.innerWidth, window.innerHeight);
    setViewport(fit);
  };

  return { handlePhotoFile };
}
