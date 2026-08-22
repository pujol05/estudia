export const PROFILE_IMAGE_MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB maximum upload size for profile images
export const PROFILE_IMAGE_MAX_STORED_BYTES = 750_000; // 750 KB maximum size after processing
export const PROFILE_IMAGE_OUTPUT_SIZE = 512; // 512x512 pixels output size for profile images
export const PROFILE_IMAGE_CONTENT_TYPE = "image/webp";

export const PROFILE_IMAGE_ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

const PROFILE_IMAGE_BLOB_HOST_SUFFIX = ".public.blob.vercel-storage.com";

export function getProfileImageUploadPath(userId: string) {
  return `avatars/${encodeURIComponent(userId)}/avatar.webp`;
}

export function isOwnedProfileImagePath(pathname: string, userId: string) {
  const userDirectory = `avatars/${encodeURIComponent(userId)}/`;

  return (
    pathname.startsWith(userDirectory) &&
    pathname.slice(userDirectory.length).startsWith("avatar-") &&
    pathname.endsWith(".webp")
  );
}

export function isOwnedProfileImageBlobUrl(value: string, userId: string) {
  try {
    const url = new URL(value);
    const pathname = decodeURIComponent(url.pathname.replace(/^\//, ""));

    return (
      url.protocol === "https:" &&
      url.hostname.endsWith(PROFILE_IMAGE_BLOB_HOST_SUFFIX) &&
      url.hostname !== PROFILE_IMAGE_BLOB_HOST_SUFFIX.slice(1) &&
      !url.username &&
      !url.password &&
      !url.port &&
      !url.search &&
      !url.hash &&
      isOwnedProfileImagePath(pathname, userId)
    );
  } catch {
    return false;
  }
}
