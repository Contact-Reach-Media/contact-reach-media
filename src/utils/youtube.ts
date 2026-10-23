/**
 * ContactReach Market - YouTube Media Utilities
 * Handles parsing, validation, embed URL generation, and thumbnail fetching
 * for YouTube product video descriptions.
 * Supports standard URLs, shorts, youtu.be, embeds, and mobile URLs.
 */

/**
 * Extracts the 11-character YouTube video ID from various YouTube URL formats
 * or returns the string directly if already a valid 11-character video ID.
 */
export function getYouTubeVideoId(url: string | null | undefined): string | null {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  // Direct 11-character alphanumeric YouTube ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  // Short URL: https://youtu.be/VIDEO_ID or youtu.be/VIDEO_ID?t=...
  const shortMatch = trimmed.match(/(?:https?:\/\/)?(?:www\.)?youtu\.be\/([a-zA-Z0-9_-]{11})/i);
  if (shortMatch && shortMatch[1]) return shortMatch[1];

  // Shorts URL: https://www.youtube.com/shorts/VIDEO_ID
  const shortsMatch = trimmed.match(/(?:https?:\/\/)?(?:www\.|m\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/i);
  if (shortsMatch && shortsMatch[1]) return shortsMatch[1];

  // Standard Watch URL: https://www.youtube.com/watch?v=VIDEO_ID
  const watchMatch = trimmed.match(/(?:https?:\/\/)?(?:www\.|m\.)?youtube\.com\/watch\?(?:.*&)?v=([a-zA-Z0-9_-]{11})/i);
  if (watchMatch && watchMatch[1]) return watchMatch[1];

  // Embed URL: https://www.youtube.com/embed/VIDEO_ID
  const embedMatch = trimmed.match(/(?:https?:\/\/)?(?:www\.|m\.)?youtube(?:-nocookie)?\.com\/embed\/([a-zA-Z0-9_-]{11})/i);
  if (embedMatch && embedMatch[1]) return embedMatch[1];

  // Generic fallback match for 11 chars after v= or /
  const genericMatch = trimmed.match(/(?:v=|\/)([a-zA-Z0-9_-]{11})(?:\?|&|\/|$)/);
  if (genericMatch && genericMatch[1]) return genericMatch[1];

  return null;
}

/**
 * Returns a privacy-enhanced YouTube embed player URL with safe parameters.
 */
export function getYouTubeEmbedUrl(url: string | null | undefined, autoplay: boolean = false): string | null {
  const videoId = getYouTubeVideoId(url);
  if (!videoId) return null;
  return `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1${autoplay ? '&autoplay=1' : ''}`;
}

/**
 * Returns high-quality YouTube video thumbnail image URL.
 */
export function getYouTubeThumbnailUrl(url: string | null | undefined): string | null {
  const videoId = getYouTubeVideoId(url);
  if (!videoId) return null;
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

/**
 * Validates if the given string represents a valid YouTube URL or video ID.
 */
export function isValidYouTubeUrl(url: string | null | undefined): boolean {
  return getYouTubeVideoId(url) !== null;
}
