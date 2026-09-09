"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { upload } from "@vercel/blob/client";
import { useLocale, useTranslations } from "next-intl";

import { authClient } from "@/lib/auth-client";
import { useRouter } from "@/i18n/navigation";
import { prepareProfileImage } from "@/lib/profile-image-client";
import {
  getProfileImageUploadPath,
  PROFILE_IMAGE_ALLOWED_TYPES,
  PROFILE_IMAGE_CONTENT_TYPE,
  PROFILE_IMAGE_MAX_UPLOAD_BYTES,
} from "@/lib/profile-image";

import styles from "./ProfileForm.module.css";

type Props = {
  userId: string;
  initialName: string;
  initialEmail: string;
  initialImage: string | null;
};

export default function ProfileForm({
  userId,
  initialName,
  initialEmail,
  initialImage,
}: Props) {
  const t = useTranslations("Profile");
  const locale = useLocale();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  // The account's real current email, unaffected by whatever is typed in the
  // field below. Never reassigned: a pending change only takes effect after
  // both confirmation links are clicked, which happens outside this page.
  const savedEmail = initialEmail;
  const [image, setImage] = useState(initialImage);
  const [isUpdatingImage, setIsUpdatingImage] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [deletePending, setDeletePending] = useState(false);

  const initial = name.trim().charAt(0).toUpperCase() || "?";
  async function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    setError("");
    setSuccess("");

    if (
      !PROFILE_IMAGE_ALLOWED_TYPES.includes(
        file.type as (typeof PROFILE_IMAGE_ALLOWED_TYPES)[number],
      )
    ) {
      setError(t("photoInvalidType"));
      return;
    }

    if (file.size > PROFILE_IMAGE_MAX_UPLOAD_BYTES) {
      setError(t("photoTooLarge"));
      return;
    }

    setIsUpdatingImage(true);

    try {
      const preparedImage = await prepareProfileImage(file);
      const blob = await upload(
        getProfileImageUploadPath(userId),
        preparedImage,
        {
          access: "public",
          contentType: PROFILE_IMAGE_CONTENT_TYPE,
          handleUploadUrl: "/api/profile/avatar/upload",
        },
      );
      const response = await fetch("/api/profile/avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: blob.url }),
      });

      if (!response.ok) {
        throw new Error("The uploaded profile image could not be saved");
      }

      const result = (await response.json()) as { image?: unknown };

      if (typeof result.image !== "string") {
        throw new Error("The profile image response is invalid");
      }

      setImage(result.image);
      setSuccess(t("photoSaveSuccess"));
      router.refresh();
    } catch {
      setError(t("photoUploadError"));
    } finally {
      setIsUpdatingImage(false);
    }
  }

  async function handlePhotoRemove() {
    setError("");
    setSuccess("");
    setIsUpdatingImage(true);

    try {
      const response = await fetch("/api/profile/avatar", {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("The profile image could not be removed");
      }

      setImage(null);
      setSuccess(t("photoRemoveSuccess"));
      router.refresh();
    } catch {
      setError(t("photoRemoveError"));
    } finally {
      setIsUpdatingImage(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const normalizedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();

    if (normalizedName.length < 2 || normalizedName.length > 80) {
      setError(t("nameError"));
      return;
    }

    setIsSaving(true);

    try {
      const emailChangeRequested = normalizedEmail !== savedEmail.toLowerCase();

      if (emailChangeRequested) {
        // better-auth sends this same callbackURL to both the old-address
        // confirmation link and the new-address verification link that
        // follows it. The result page (src/app/[locale]/verify-email) tells
        // the two apart by checking whether the session's email already
        // matches pendingEmail — so it has to travel through both hops.
        const callbackURL = `${window.location.origin}/${locale}/verify-email?pendingEmail=${encodeURIComponent(normalizedEmail)}`;

        const { error: emailError } = await authClient.changeEmail({
          newEmail: normalizedEmail,
          callbackURL,
        });

        if (emailError) {
          setError(t("emailError"));
          return;
        }
      }

      const { error: updateError } = await authClient.updateUser({
        name: normalizedName,
      });

      if (updateError) {
        setError(t("saveError"));
        return;
      }

      setName(normalizedName);

      if (emailChangeRequested) {
        // The account's email hasn't changed yet: better-auth only applies it
        // once both the current and the new address have confirmed via the
        // links it just sent them. Reverting the field to what's actually
        // still on the account avoids the input silently disagreeing with a
        // reload once the pending change is confirmed (or ignored).
        setEmail(savedEmail);
        setSuccess(t("emailChangePending"));
      } else {
        setSuccess(t("saveSuccess"));
      }

      router.refresh();
    } catch {
      setError(t("saveError"));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteAccount() {
    setDeleteError("");
    setIsDeleting(true);

    try {
      // The confirmation link this triggers only works while the person
      // clicking it is signed in on that browser (better-auth checks the
      // session, not just the token) — there's no cross-device magic link
      // here the way there is for verifying a new email address.
      const callbackURL = `${window.location.origin}/${locale}/account-deleted`;

      const { error: deleteRequestError } = await authClient.deleteUser({
        callbackURL,
      });

      if (deleteRequestError) {
        setDeleteError(t("deleteError"));
        return;
      }

      setDeletePending(true);
      setIsConfirmingDelete(false);
    } catch {
      setDeleteError(t("deleteError"));
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <section className={styles.profile}>
      <div className={styles.heading}>
        <h1>{t("title")}</h1>
        <p>{t("subtitle")}</p>
      </div>

      <form className={styles.form} onSubmit={handleSubmit}>
        <section className={styles.photoSection}>
          <div className={styles.photo}>
            {image ? (
              <Image
                src={image}
                alt=""
                width={112}
                height={112}
                unoptimized
              />
            ) : (
              <span>{initial}</span>
            )}
          </div>

          <div className={styles.photoContent}>
            <h2>{t("photoTitle")}</h2>
            <p>{t("photoHelp")}</p>

            <div className={styles.photoActions}>
              <input
                ref={fileInputRef}
                type="file"
                className={styles.fileInput}
                accept={PROFILE_IMAGE_ALLOWED_TYPES.join(",")}
                onChange={handlePhotoChange}
                aria-label={t("photoSelect")}
                disabled={isUpdatingImage || isSaving}
              />

              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => fileInputRef.current?.click()}
                disabled={isUpdatingImage || isSaving}
              >
                {isUpdatingImage ? t("photoUploading") : t("photoChange")}
              </button>

              {image && (
                <button
                  type="button"
                  className={styles.textButton}
                  onClick={handlePhotoRemove}
                  disabled={isUpdatingImage || isSaving}
                >
                  {t("photoRemove")}
                </button>
              )}
            </div>
          </div>
        </section>

        <div className={styles.divider} />

        <section className={styles.fieldsSection}>
          <h2>{t("personalData")}</h2>

          <div className={styles.fieldsGrid}>
            <div className={styles.field}>
              <label htmlFor="profile-name">{t("name")}</label>
              <input
                id="profile-name"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                minLength={2}
                maxLength={80}
                autoComplete="name"
                required
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="profile-email">{t("email")}</label>
              <input
                id="profile-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
              />
              <p>{t("emailHelp")}</p>
            </div>

          </div>
        </section>

        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}

        {success && (
          <p className={styles.success} role="status">
            {success}
          </p>
        )}

        <div className={styles.formActions}>
          <button
            type="submit"
            className={styles.submitButton}
            disabled={isSaving || isUpdatingImage}
          >
            {isSaving ? t("saving") : t("save")}
          </button>
        </div>
      </form>

      <section className={styles.dangerZone}>
        <h2>{t("deleteTitle")}</h2>
        <p>{t("deleteWarning")}</p>

        {deletePending ? (
          <p className={styles.success} role="status">
            {t("deletePending", { email: savedEmail })}
          </p>
        ) : isConfirmingDelete ? (
          <>
            <p className={styles.dangerPrompt}>{t("deleteConfirmPrompt")}</p>

            {deleteError && (
              <p className={styles.error} role="alert">
                {deleteError}
              </p>
            )}

            <div className={styles.dangerActions}>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => setIsConfirmingDelete(false)}
                disabled={isDeleting}
              >
                {t("deleteCancelButton")}
              </button>

              <button
                type="button"
                className={styles.dangerButton}
                onClick={handleDeleteAccount}
                disabled={isDeleting}
              >
                {isDeleting ? t("deleteSending") : t("deleteConfirmButton")}
              </button>
            </div>
          </>
        ) : (
          <button
            type="button"
            className={styles.textButton}
            onClick={() => setIsConfirmingDelete(true)}
          >
            {t("deleteButton")}
          </button>
        )}
      </section>
    </section>
  );
}
