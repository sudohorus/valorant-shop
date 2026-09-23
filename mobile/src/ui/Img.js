// Imagem com cache em disco e fade-in, no lugar do <Image> do RN.
// Mesma interface que o app já usava (source, style, resizeMode).

import { Image as ExpoImage } from 'expo-image';

const FIT = {
  cover: 'cover',
  contain: 'contain',
  stretch: 'fill',
  center: 'none',
};

export function Image({ resizeMode = 'cover', transition = 180, ...props }) {
  return (
    <ExpoImage
      contentFit={FIT[resizeMode] || 'cover'}
      transition={transition}
      cachePolicy="memory-disk"
      {...props}
    />
  );
}
