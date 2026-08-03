import React, { useState } from 'react';
import { Image as RNImage, ImageProps as RNImageProps, View } from 'react-native';

interface SafeImageProps extends RNImageProps {
  uri?: string;
  fallback?: string;
}

export default function SafeImage(props: SafeImageProps) {
  const [error, setError] = useState(false);

  // Try to use expo-image if available, otherwise fall back to react-native Image
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Image: ExpoImage } = require('expo-image');
    return (
      <ExpoImage
        {...props}
        onError={() => {
          setError(true);
          props.onError?.({} as any);
        }}
      />
    );
  } catch {
    // expo-image not available, use react-native Image fallback
    return (
      <RNImage
        {...props}
        onError={() => {
          setError(true);
          props.onError?.({} as any);
        }}
      />
    );
  }
}