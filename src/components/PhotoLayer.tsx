import { Layer, Image as KonvaImage } from 'react-konva';
import useImage from 'use-image';
import { useAppStore } from '../store/useAppStore';

export function PhotoLayer() {
  const photoUrl = useAppStore((s) => s.photoUrl);
  const [image, status] = useImage(photoUrl ?? '');

  if (!photoUrl || status !== 'loaded' || !image) return null;

  return (
    <Layer>
      <KonvaImage image={image} x={0} y={0} />
    </Layer>
  );
}
