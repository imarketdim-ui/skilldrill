import { supabase } from '@/integrations/supabase/client';

const PRIVATE_BUCKETS = ['certificates'];
const SUPABASE_URL = 'https://fttbwjuaaltomksuslyi.supabase.co';

/**
 * Extract storage path from a full public URL or return as-is if already a path.
 */
function extractPath(bucket: string, urlOrPath: string): string {
  const prefix = `${SUPABASE_URL}/storage/v1/object/public/${bucket}/`;
  if (urlOrPath.startsWith(prefix)) {
    return decodeURIComponent(urlOrPath.slice(prefix.length));
  }
  return urlOrPath;
}

/**
 * For private buckets, generates a signed URL (1 hour expiry).
 * For public buckets, returns the public URL as-is.
 */
export async function resolveStorageUrl(bucket: string, urlOrPath: string): Promise<string> {
  if (!PRIVATE_BUCKETS.includes(bucket)) {
    return urlOrPath;
  }
  const path = extractPath(bucket, urlOrPath);
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 3600);
  if (error || !data?.signedUrl) {
    console.error('Failed to create signed URL:', error);
    return urlOrPath; // fallback
  }
  return data.signedUrl;
}

/**
 * Resolve an array of URLs for a bucket, returning signed URLs for private buckets.
 */
export async function resolveStorageUrls(bucket: string, urls: string[]): Promise<string[]> {
  if (!PRIVATE_BUCKETS.includes(bucket)) return urls;
  return Promise.all(urls.map(u => resolveStorageUrl(bucket, u)));
}

/**
 * After uploading to a bucket, get the appropriate URL to store.
 * For private buckets, stores the path (not a public URL).
 * For public buckets, stores the full public URL.
 */
export function getStorageReference(bucket: string, path: string): string {
  if (PRIVATE_BUCKETS.includes(bucket)) {
    return path; // store path only for private buckets
  }
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}
