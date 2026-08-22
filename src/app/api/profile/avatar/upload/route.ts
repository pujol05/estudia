import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";

import { auth } from "@/lib/auth";
import {
  getProfileImageUploadPath,
  isOwnedProfileImageBlobUrl,
  isOwnedProfileImagePath,
  PROFILE_IMAGE_CONTENT_TYPE,
  PROFILE_IMAGE_MAX_STORED_BYTES,
} from "@/lib/profile-image";
import { saveProfileImage } from "@/lib/profile-image-storage";

type TokenPayload = {
  userId: string;
};

function parseTokenPayload(value: string | null | undefined) {
  if (!value) {
    throw new Error("Missing profile image token payload");
  }

  const payload = JSON.parse(value) as Partial<TokenPayload>;

  if (typeof payload.userId !== "string" || !payload.userId) {
    throw new Error("Invalid profile image token payload");
  }

  return payload as TokenPayload;
}

export async function POST(request: Request) {
  let authenticatedUserId: string | null = null;

  try {
    const body = (await request.json()) as HandleUploadBody;

    if (body.type === "blob.generate-client-token") {
      const session = await auth.api.getSession({ headers: request.headers });

      if (!session) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }

      authenticatedUserId = session.user.id;
    }

    const response = await handleUpload({
      request,
      body,
      onBeforeGenerateToken: async (pathname) => {
        if (!authenticatedUserId) {
          throw new Error("Unauthorized profile image upload");
        }

        if (pathname !== getProfileImageUploadPath(authenticatedUserId)) {
          throw new Error("Invalid profile image pathname");
        }

        return {
          allowedContentTypes: [PROFILE_IMAGE_CONTENT_TYPE],
          maximumSizeInBytes: PROFILE_IMAGE_MAX_STORED_BYTES,
          addRandomSuffix: true,
          cacheControlMaxAge: 31_536_000,
          tokenPayload: JSON.stringify({ userId: authenticatedUserId }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        const { userId } = parseTokenPayload(tokenPayload);

        if (
          blob.contentType !== PROFILE_IMAGE_CONTENT_TYPE ||
          !isOwnedProfileImagePath(blob.pathname, userId) ||
          !isOwnedProfileImageBlobUrl(blob.url, userId)
        ) {
          throw new Error("Invalid completed profile image upload");
        }

        await saveProfileImage(userId, blob.url);
      },
    });

    return Response.json(response);
  } catch (error) {
    console.error("Profile image upload failed", error);

    return Response.json(
      { error: "Profile image upload failed" },
      { status: 500 },
    );
  }
}
