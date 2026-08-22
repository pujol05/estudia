import { del } from "@vercel/blob";

import prisma from "@/lib/prisma";
import { isOwnedProfileImageBlobUrl } from "@/lib/profile-image";

async function deleteStoredProfileImage(image: string | null, userId: string) {
  if (!image || !isOwnedProfileImageBlobUrl(image, userId)) {
    return;
  }

  try {
    await del(image);
  } catch (error) {
    console.error("Could not delete the previous profile image from Blob", error);
  }
}

export async function saveProfileImage(userId: string, image: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { image: true },
  });

  if (!user) {
    throw new Error("User not found");
  }

  if (user.image === image) {
    return image;
  }

  await prisma.user.update({
    where: { id: userId },
    data: { image },
  });

  await deleteStoredProfileImage(user.image, userId);

  return image;
}

export async function removeProfileImage(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { image: true },
  });

  if (!user) {
    throw new Error("User not found");
  }

  if (!user.image) {
    return;
  }

  await prisma.user.update({
    where: { id: userId },
    data: { image: null },
  });

  await deleteStoredProfileImage(user.image, userId);
}
