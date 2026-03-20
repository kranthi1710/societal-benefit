/**
 * Efficiently resizes and compresses an image file before converting it to Base64
 * for the Google Gemini API payload to save bandwidth and execution time.
 */
export const compressAndEncodeImage = async (file: File, maxWidth = 1024): Promise<{ base64: string, mimeType: string }> => {
  return new Promise((resolve, reject) => {
    // Basic Security: Validate MIME Type
    if (!file.type.startsWith('image/')) {
       reject(new Error("File provided is not an image format supported for compression."));
       return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error("Canvas not supported by this browser"));
        
        ctx.drawImage(img, 0, 0, width, height);
        
        // Efficiency: Compress as JPEG format to save on Gemini payload size
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.8);
        const base64 = compressedDataUrl.split(',')[1];
        resolve({ base64, mimeType: 'image/jpeg' });
      };
      img.onerror = (e) => reject(e);
    };
    reader.onerror = (e) => reject(e);
  });
};
