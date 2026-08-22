"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { useTranslations } from "next-intl";

import { authClient } from "@/lib/auth-client";
import { useRouter } from "@/i18n/navigation";
import { prepareProfileImage } from "@/lib/profile-image-client";
import {
  PROFILE_IMAGE_ALLOWED_TYPES,
  PROFILE_IMAGE_MAX_UPLOAD_BYTES,
} from "@/lib/profile-image";

import styles from "./ProfileForm.module.css";

type Props = {
  initialName: string;
  initialEmail: string;
  initialImage: string | null;
  initialBirthDate: string;
};

export default function ProfileForm({
  initialName,
  initialEmail,
  initialImage,
  initialBirthDate,
}: Props) {
  const t = useTranslations("Profile");
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [savedEmail, setSavedEmail] = useState(initialEmail);
  const [birthDate, setBirthDate] = useState(initialBirthDate);
  const [image, setImage] = useState(initialImage);
  const [isPreparingImage, setIsPreparingImage] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const initial = name.trim().charAt(0).toUpperCase() || "?";
  const today = new Date().toISOString().slice(0, 10);

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

    setIsPreparingImage(true);

    try {
      setImage(await prepareProfileImage(file));
    } catch {
      setError(t("photoError"));
    } finally {
      setIsPreparingImage(false);
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

    if (birthDate && (birthDate < "1900-01-01" || birthDate > today)) {
      setError(t("birthDateError"));
      return;
    }

    setIsSaving(true);

    try {
      if (normalizedEmail !== savedEmail.toLowerCase()) {
        const { error: emailError } = await authClient.changeEmail({
          newEmail: normalizedEmail,
        });

        if (emailError) {
          setError(t("emailError"));
          return;
        }
      }

      const { error: updateError } = await authClient.updateUser({
        name: normalizedName,
        image,
        birthDate: birthDate
          ? new Date(`${birthDate}T00:00:00.000Z`)
          : null,
      });

      if (updateError) {
        setError(t("saveError"));
        return;
      }

      setName(normalizedName);
      setEmail(normalizedEmail);
      setSavedEmail(normalizedEmail);
      setSuccess(t("saveSuccess"));
      router.refresh();
    } catch {
      setError(t("saveError"));
    } finally {
      setIsSaving(false);
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
              />

              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => fileInputRef.current?.click()}
                disabled={isPreparingImage || isSaving}
              >
                {isPreparingImage ? t("photoPreparing") : t("photoChange")}
              </button>

              {image && (
                <button
                  type="button"
                  className={styles.textButton}
                  onClick={() => setImage(null)}
                  disabled={isPreparingImage || isSaving}
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

            <div className={styles.field}>
              <label htmlFor="profile-birth-date">{t("birthDate")}</label>
              <input
                id="profile-birth-date"
                type="date"
                value={birthDate}
                onChange={(event) => setBirthDate(event.target.value)}
                min="1900-01-01"
                max={today}
                autoComplete="bday"
              />
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
            disabled={isSaving || isPreparingImage}
          >
            {isSaving ? t("saving") : t("save")}
          </button>
        </div>
      </form>
    </section>
  );
}
