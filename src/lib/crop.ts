// Client-side helper that turns an uploaded photo + a fractional bounding box
// (from AI detection) into a cropped image blob, so each detected garment can
// be reviewed and saved as its own closet item without any server-side image
// processing.
export interface BoxFraction {
  x: number;
  y: number;
  width: number;
  height: number;
}

export async function cropImageToBlob(file: File, box: BoxFraction): Promise<Blob> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = objectUrl;
    });

    const sx = Math.max(0, box.x) * image.naturalWidth;
    const sy = Math.max(0, box.y) * image.naturalHeight;
    const sw = Math.min(1 - Math.max(0, box.x), box.width) * image.naturalWidth;
    const sh = Math.min(1 - Math.max(0, box.y), box.height) * image.naturalHeight;

    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(sw));
    canvas.height = Math.max(1, Math.round(sh));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas not supported");
    ctx.drawImage(image, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Crop failed"))), "image/jpeg", 0.9);
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
