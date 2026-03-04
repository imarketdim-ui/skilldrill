import { useState, useEffect } from 'react';
import { resolveStorageUrl } from '@/lib/storage';

interface SignedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  bucket: string;
  storageSrc: string;
}

/**
 * Image component that resolves signed URLs for private storage buckets.
 * For public buckets, renders the URL directly.
 */
const SignedImage = ({ bucket, storageSrc, ...imgProps }: SignedImageProps) => {
  const [resolvedUrl, setResolvedUrl] = useState<string>(storageSrc);

  useEffect(() => {
    let cancelled = false;
    resolveStorageUrl(bucket, storageSrc).then(url => {
      if (!cancelled) setResolvedUrl(url);
    });
    return () => { cancelled = true; };
  }, [bucket, storageSrc]);

  return <img {...imgProps} src={resolvedUrl} />;
};

export default SignedImage;
