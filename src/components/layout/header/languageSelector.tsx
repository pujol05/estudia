"use client";

import { useLocale, useTranslations } from "next-intl";

import { usePathname, useRouter } from "@/i18n/navigation";

import styles from "./languageSelector.module.css";

// flag es el class name del css importat, label el text a mostrar, code el codi de l'idioma que es posarà a la url.
const languages = [
  {
    code: "ca",
    label: "Català",
    flag: "fi fi-es-ct",
  },
  {
    code: "es",
    label: "Español",
    flag: "fi fi-es",
  },
  {
    code: "en",
    label: "English",
    flag: "fi fi-gb",
  },
] as const; // as const indica que l'array no canviarà, i que cada objecte dins de l'array té propietats fixes. Això permet a TypeScript inferir els tipus correctament i assegurar-se que les propietats dels objectes no es modifiquin accidentalment en altres parts del codi.

/* crea "ca" | "es" | "en" a partir de l'array languages, despres a changeLanguage
nomes permet aquests 3 valors. */
type LanguageCode = (typeof languages)[number]["code"]; 

type Props = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
};

export default function LanguageSelector({ isOpen, onOpenChange }: Props) {
  const locale = useLocale(); //retorna l'idioma actual de la ruta, per exemple "ca", "es" o "en"
  const pathname = usePathname(); //pagina actual /tasks, /grades, /subjects, etc.
  const router = useRouter(); //navegar amb JS , en lloc de fer un refresh de la pagina, canvia l'idioma i manté la pagina actual.

  const t = useTranslations("LanguageSelector");

  const currentLanguage = languages.find((language) => language.code === locale) ?? languages[0];

  function changeLanguage(newLocale: LanguageCode) {
    router.replace(pathname, {
      locale: newLocale,
    });
    //canvia el locale, de ca/tasks a es/tasks i tanca el menu desplegable d'idiomes. 
    onOpenChange(false);
  }

  return (
    <div className={styles.languageSelector}>
      <button
        type="button"
        className={styles.trigger}
        onClick={() => onOpenChange(!isOpen)}
        aria-expanded={isOpen}
        aria-label={t("label")}
      >
        <span
          className={`${currentLanguage.flag} ${styles.flag}`}
          aria-hidden="true"
        />

        <span>{currentLanguage.code.toUpperCase()}</span>

        <span className={styles.arrow} aria-hidden="true">
          ▾
        </span>
      </button>

      {/* Si isOpen és true, mostra el menú desplegable amb les opcions d'idioma. 
      
        map = repeteix JSX per cada element de l'array
        key = identificador únic que React usa internament  
      */}
      {isOpen && (
        <ul className={styles.menu}>
          {languages.map((language) => (
            <li key={language.code}>
              <button
                type="button"
                className={styles.option}
                onClick={() => changeLanguage(language.code)}
              >
                <span
                  className={`${language.flag} ${styles.flag}`}
                  aria-hidden="true"
                />

                <span>{language.label}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
