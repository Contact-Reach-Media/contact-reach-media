/**
 * Client-side fast image compressor using HTML Canvas
 * Resizes large photos/camera captures down to web-optimal dimensions & quality
 * Keeps file sizes under ~100-200KB for instantaneous uploads and prevents Firestore 1MB limits.
 */
export function compressImageFile(
  file: File,
  maxWidthOrOptions: number | { maxWidth?: number; maxHeight?: number; quality?: number } = 1200,
  maxHeight: number = 1200,
  quality: number = 0.82
): Promise<string> {
  const maxWidth = typeof maxWidthOrOptions === 'object' ? (maxWidthOrOptions.maxWidth ?? 1200) : maxWidthOrOptions;
  const targetMaxHeight = typeof maxWidthOrOptions === 'object' ? (maxWidthOrOptions.maxHeight ?? 1200) : maxHeight;
  const targetQuality = typeof maxWidthOrOptions === 'object' ? (maxWidthOrOptions.quality ?? 0.82) : quality;
  return new Promise((resolve) => {
    if (file.type === 'image/svg+xml') {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => resolve('');
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (!dataUrl) {
        resolve('');
        return;
      }
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > targetMaxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * targetMaxHeight) / height);
            height = targetMaxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(dataUrl);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const compressed = canvas.toDataURL('image/jpeg', targetQuality);
        resolve(compressed);
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    };
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });
}
