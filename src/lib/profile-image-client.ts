import {
  PROFILE_IMAGE_CONTENT_TYPE,
  PROFILE_IMAGE_OUTPUT_SIZE,
  PROFILE_IMAGE_MAX_STORED_BYTES,
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

  const imageBlob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, PROFILE_IMAGE_CONTENT_TYPE, 0.82);
  });

  if (
    !imageBlob ||
    imageBlob.type !== PROFILE_IMAGE_CONTENT_TYPE ||
    imageBlob.size > PROFILE_IMAGE_MAX_STORED_BYTES
  ) {
    throw new Error("The processed image is invalid or too large");
  }

  return new File([imageBlob], "avatar.webp", {
    type: PROFILE_IMAGE_CONTENT_TYPE,
  });
}
