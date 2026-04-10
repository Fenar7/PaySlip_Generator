"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

const LANGUAGES = [
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "hi", label: "Hindi", flag: "🇮🇳" },
  { code: "ar", label: "Arabic", flag: "🇸🇦" },
  { code: "es", label: "Spanish", flag: "🇪🇸" },
  { code: "fr", label: "French", flag: "🇫🇷" },
  { code: "de", label: "German", flag: "🇩🇪" },
];

interface LanguageSwitcherProps {
  currentLocale?: string;
  onLocaleChange?: (locale: string) => void;
}

export function LanguageSwitcher({
  currentLocale = "en",
  onLocaleChange,
}: LanguageSwitcherProps) {
  const [open, setOpen] = useState(false);
  const current = LANGUAGES.find((l) => l.code === currentLocale) || LANGUAGES[0];

  function handleSelect(code: string) {
    setOpen(false);
    document.cookie = `locale=${code};path=/;max-age=31536000`;
    onLocaleChange?.(code);
    window.location.reload();
  }

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(!open)}
        className="gap-1.5 text-sm"
      >
        <span>{current.flag}</span>
        <span className="hidden sm:inline">{current.label}</span>
      </Button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-44 rounded-md border bg-white shadow-lg dark:bg-gray-900">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleSelect(lang.code)}
              className={`flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 ${
                lang.code === currentLocale
                  ? "bg-gray-50 font-medium dark:bg-gray-800"
                  : ""
              }`}
            >
              <span>{lang.flag}</span>
              <span>{lang.label}</span>
              {lang.code === currentLocale && (
                <span className="ml-auto text-green-600">✓</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
