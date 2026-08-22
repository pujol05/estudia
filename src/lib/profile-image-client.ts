import {
  isValidProfileImageDataUrl,
  PROFILE_IMAGE_OUTPUT_SIZE,
} from "@/lib/profile-image";

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const source = document.createElement("img");

    source.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(source);
    };

    source.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("The selected image could not be read"));
    };

    source.src = objectUrl;
  });
}

export async function prepareProfileImage(file: File) {
  const source = await loadImage(file);
  const sourceSize = Math.min(source.naturalWidth, source.naturalHeight);

  if (sourceSize === 0) {
    throw new Error("The selected image has invalid dimensions");
  }

  const outputSize = Math.min(sourceSize, PROFILE_IMAGE_OUTPUT_SIZE);
  const sourceX = (source.naturalWidth - sourceSize) / 2;
  const sourceY = (source.naturalHeight - sourceSize) / 2;

  const canvas = document.createElement("canvas");
  canvas.width = outputSize;
  canvas.height = outputSize;

  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Image processing is not available");
  }

  context.drawImage(
    source,
    sourceX,
    sourceY,
    sourceSize,
    sourceSize,
    0,
    0,
    outputSize,
    outputSize,
  );

  const imageDataUrl = canvas.toDataURL("image/webp", 0.82);

  if (!isValidProfileImageDataUrl(imageDataUrl)) {
    throw new Error("The processed image is invalid or too large");
  }

  return imageDataUrl;
}
