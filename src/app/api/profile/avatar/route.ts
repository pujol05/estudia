import { head } from "@vercel/blob";

import { auth } from "@/lib/auth";
import {
  isOwnedProfileImageBlobUrl,
  isOwnedProfileImagePath,
  PROFILE_IMAGE_CONTENT_TYPE,
  PROFILE_IMAGE_MAX_STORED_BYTES,
} from "@/lib/profile-image";
import {
  removeProfileImage,
  saveProfileImage,
} from "@/lib/profile-image-storage";

async function getSession(request: Request) {
  return auth.api.getSession({ headers: request.headers });
}

export async function POST(request: Request) {
  try {
    const session = await getSession(request);

    if (!session) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as { url?: unknown };

    if (
      typeof body.url !== "string" ||
      !isOwnedProfileImageBlobUrl(body.url, session.user.id)
    ) {
      return Response.json({ error: "Invalid image URL" }, { status: 400 });
    }

    const blob = await head(body.url);

    if (
      blob.url !== body.url ||
      blob.contentType !== PROFILE_IMAGE_CONTENT_TYPE ||
      blob.size > PROFILE_IMAGE_MAX_STORED_BYTES ||
      !isOwnedProfileImagePath(blob.pathname, session.user.id)
    ) {
      return Response.json({ error: "Invalid image" }, { status: 400 });
    }

    const image = await saveProfileImage(session.user.id, blob.url);

    return Response.json({ image });
  } catch (error) {
    console.error("Could not save the profile image", error);

    return Response.json(
      { error: "Could not save the profile image" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getSession(request);

    if (!session) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    await removeProfileImage(session.user.id);

    return new Response(null, { status: 204 });
  } catch (error) {
    console.error("Could not remove the profile image", error);

    return Response.json(
      { error: "Could not remove the profile image" },
      { status: 500 },
    );
  }
}
