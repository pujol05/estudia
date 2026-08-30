"use client";

import Script from "next/script";
import { useCallback, useEffect, useRef } from "react";

import type { TurnstileAction } from "@/lib/turnstile";

import styles from "./TurnstileWidget.module.css";

type TurnstileOptions = {
  sitekey: string;
  action: string;
  language: string;
  theme: "light";
  callback: (token: string) => void;
  "expired-callback": () => void;
  "error-callback": () => void;
};

type TurnstileApi = {
  render: (container: HTMLElement, options: TurnstileOptions) => string;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

type Props = {
  siteKey: string;
  locale: string;
  action: TurnstileAction;
  onTokenChange: (token: string) => void;
  onError: () => void;
};

export default function TurnstileWidget({
  siteKey,
  locale,
  action,
  onTokenChange,
  onError,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  const renderWidget = useCallback(() => {
    if (!containerRef.current || !window.turnstile || widgetIdRef.current) {
      return;
    }

    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: siteKey,
      action,
      language: locale === "ca" ? "es" : locale,
      theme: "light",
      callback: onTokenChange,
      "expired-callback": () => onTokenChange(""),
      "error-callback": () => {
        onTokenChange("");
        onError();
      },
    });
  }, [action, locale, onError, onTokenChange, siteKey]);

  useEffect(() => {
    renderWidget();

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [renderWidget]);

  return (
    <div className={styles.container}>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onReady={renderWidget}
        onError={onError}
      />
      <div ref={containerRef} />
    </div>
  );
}
