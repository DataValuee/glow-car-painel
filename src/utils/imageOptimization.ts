
/**
 * Compresses and resizes an image to be used in a PDF.
 * @param src The source image URL or base64.
 * @param maxWidth The maximum width of the output image.
 * @param quality The quality of the JPEG compression (0 to 1).
 * @returns A promise that resolves to a base64 string.
 */
export const processImageForPDF = (
    src: string,
    maxWidth: number = 1000,
    quality: number = 0.75
): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
            const canvas = document.createElement("canvas");
            let width = img.width;
            let height = img.height;

            // Calculate new dimensions while maintaining aspect ratio
            if (width > maxWidth) {
                height = (height * maxWidth) / width;
                width = maxWidth;
            }

            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext("2d");
            if (!ctx) {
                reject(new Error("Canvas context not defined"));
                return;
            }

            // Fill background (white) for transparency-handling if needed
            ctx.fillStyle = "#FFFFFF";
            ctx.fillRect(0, 0, width, height);

            ctx.drawImage(img, 0, 0, width, height);

            // Convert to webp if supported, fallback to jpeg
            const dataUrl = canvas.toDataURL("image/jpeg", quality);
            resolve(dataUrl);
        };
        img.onerror = (err) => reject(new Error(`Failed to load image: ${err}`));
        img.src = src;
    });
};
