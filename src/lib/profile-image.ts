export const PROFILE_IMAGE_MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB maximum upload size for profile images
export const PROFILE_IMAGE_MAX_DATA_URL_LENGTH = 750_000; // 750 KB maximum length for profile image data URLs
export const PROFILE_IMAGE_OUTPUT_SIZE = 512; // 512x512 pixels output size for profile images

export const PROFILE_IMAGE_ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

const PROFILE_IMAGE_DATA_URL_PATTERN =
  /^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/;

export function isValidProfileImageDataUrl(value: string) {
  return (
    value.length <= PROFILE_IMAGE_MAX_DATA_URL_LENGTH &&
    PROFILE_IMAGE_DATA_URL_PATTERN.test(value)
  );
}
