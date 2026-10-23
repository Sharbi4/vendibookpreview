/** Render existing HEIC/HEIF photos as browser-compatible images without changing the original. */
export function listingCardImageUrl(source: string): string {
  try {
    const url = new URL(source);
    if (url.hostname !== 'nbrehbwfsmedbelzntqs.supabase.co' || !url.pathname.startsWith('/storage/v1/object/public/listing-images/') || !/\.hei[cf]$/i.test(url.pathname)) return source;
    url.pathname = url.pathname.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/');
    url.searchParams.set('width', '800');
    url.searchParams.set('quality', '80');
    return url.toString();
  } catch { return source; }
}
