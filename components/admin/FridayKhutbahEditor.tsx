"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { hasPublishableKhutbahContent, type FridayKhutbahForm } from "@/lib/friday-khutbah";
import type { Locale } from "@/lib/i18n/types";
import { useTranslation } from "@/lib/i18n/use-translation";
import {
  getFridayKhutbahAdminAction,
  saveFridayKhutbahAction,
  unpublishFridayKhutbahAction,
} from "@/app/admin/jumuah/khutbah-actions";

const LANGUAGES = [
  { code: "ar", label: "العربية", direction: "rtl" as const, titleKey: "titleAr", contentKey: "contentAr" },
  { code: "en", label: "English", direction: "ltr" as const, titleKey: "titleEn", contentKey: "contentEn" },
  { code: "de", label: "Deutsch", direction: "ltr" as const, titleKey: "titleDe", contentKey: "contentDe" },
  { code: "tr", label: "Türkçe", direction: "ltr" as const, titleKey: "titleTr", contentKey: "contentTr" },
] satisfies Array<{
  code: Locale;
  label: string;
  direction: "rtl" | "ltr";
  titleKey: keyof FridayKhutbahForm;
  contentKey: keyof FridayKhutbahForm;
}>;

const EMPTY_FORM: FridayKhutbahForm = {
  titleAr: "",
  contentAr: "",
  titleEn: "",
  contentEn: "",
  titleDe: "",
  contentDe: "",
  titleTr: "",
  contentTr: "",
};

const COPY: Record<Locale, {
  heading: string;
  help: string;
  title: string;
  content: string;
  saveDraft: string;
  publish: string;
  unpublish: string;
  saved: string;
  published: string;
  unpublished: string;
  loading: string;
  loadFailed: string;
  saveFailed: string;
  publishRequiresContent: string;
  statusDraft: string;
  statusPublished: string;
}> = {
  ar: {
    heading: "خطبة الجمعة",
    help: "خطبة واحدة لهذا الجمعة. يمكنك كتابة أي لغة أو أكثر، وجميع الحقول اختيارية أثناء الحفظ كمسودة.",
    title: "العنوان",
    content: "نص الخطبة",
    saveDraft: "حفظ كمسودة",
    publish: "نشر الخطبة",
    unpublish: "إلغاء النشر",
    saved: "تم حفظ المسودة.",
    published: "تم نشر الخطبة.",
    unpublished: "تم إلغاء نشر الخطبة.",
    loading: "جارٍ تحميل الخطبة…",
    loadFailed: "تعذر تحميل الخطبة.",
    saveFailed: "تعذر حفظ الخطبة.",
    publishRequiresContent: "أضف نص الخطبة بلغة واحدة على الأقل قبل النشر.",
    statusDraft: "مسودة",
    statusPublished: "منشورة",
  },
  en: {
    heading: "Friday Khutbah",
    help: "One khutbah for this Friday. Any subset of languages may be prepared; every field is optional while saving a draft.",
    title: "Title",
    content: "Khutbah text",
    saveDraft: "Save draft",
    publish: "Publish Khutbah",
    unpublish: "Unpublish",
    saved: "Draft saved.",
    published: "Khutbah published.",
    unpublished: "Khutbah unpublished.",
    loading: "Loading khutbah…",
    loadFailed: "Could not load the khutbah.",
    saveFailed: "Could not save the khutbah.",
    publishRequiresContent: "Add khutbah content in at least one language before publishing.",
    statusDraft: "Draft",
    statusPublished: "Published",
  },
  de: {
    heading: "Freitagspredigt",
    help: "Eine Predigt für diesen Freitag. Beliebige Sprachen können vorbereitet werden; beim Speichern als Entwurf sind alle Felder optional.",
    title: "Titel",
    content: "Predigttext",
    saveDraft: "Entwurf speichern",
    publish: "Predigt veröffentlichen",
    unpublish: "Veröffentlichung aufheben",
    saved: "Entwurf gespeichert.",
    published: "Predigt veröffentlicht.",
    unpublished: "Veröffentlichung aufgehoben.",
    loading: "Predigt wird geladen…",
    loadFailed: "Die Predigt konnte nicht geladen werden.",
    saveFailed: "Die Predigt konnte nicht gespeichert werden.",
    publishRequiresContent: "Vor der Veröffentlichung muss in mindestens einer Sprache Predigttext vorhanden sein.",
    statusDraft: "Entwurf",
    statusPublished: "Veröffentlicht",
  },
  tr: {
    heading: "Cuma Hutbesi",
    help: "Bu Cuma için tek hutbe. İstenen diller hazırlanabilir; taslak kaydederken tüm alanlar isteğe bağlıdır.",
    title: "Başlık",
    content: "Hutbe metni",
    saveDraft: "Taslağı kaydet",
    publish: "Hutbeyi yayınla",
    unpublish: "Yayından kaldır",
    saved: "Taslak kaydedildi.",
    published: "Hutbe yayınlandı.",
    unpublished: "Hutbe yayından kaldırıldı.",
    loading: "Hutbe yükleniyor…",
    loadFailed: "Hutbe yüklenemedi.",
    saveFailed: "Hutbe kaydedilemedi.",
    publishRequiresContent: "Yayınlamadan önce en az bir dilde hutbe metni ekleyin.",
    statusDraft: "Taslak",
    statusPublished: "Yayınlandı",
  },
};

type EditorState = {
  date: string;
  form: FridayKhutbahForm;
  published: boolean;
  loadStatus: "ready" | "error";
};

type LanguageSelection = {
  locale: Locale;
  language: Locale;
};

type MessageState = {
  date: string;
  message: string;
};

export function FridayKhutbahEditor({
  selectedFriday,
  token,
  disabled = false,
}: {
  selectedFriday: string;
  token: string;
  disabled?: boolean;
}) {
  const { locale } = useTranslation();
  const copy = COPY[locale];
  const [editorState, setEditorState] = useState<EditorState | null>(null);
  const [languageSelection, setLanguageSelection] = useState<LanguageSelection | null>(null);
  const [errorState, setErrorState] = useState<MessageState | null>(null);
  const [successState, setSuccessState] = useState<MessageState | null>(null);
  const [isPending, startTransition] = useTransition();

  const hasCurrentEditorState = editorState?.date === selectedFriday;
  const form = hasCurrentEditorState ? editorState.form : EMPTY_FORM;
  const published = hasCurrentEditorState ? editorState.published : false;
  const loading = Boolean(selectedFriday && token && !hasCurrentEditorState);
  const loadFailed = Boolean(hasCurrentEditorState && editorState.loadStatus === "error");
  const error = errorState?.date === selectedFriday ? errorState.message : "";
  const success = successState?.date === selectedFriday ? successState.message : "";
  const activeLanguage = languageSelection?.locale === locale ? languageSelection.language : locale;

  useEffect(() => {
    let active = true;
    if (!selectedFriday || !token) return () => { active = false; };

    void getFridayKhutbahAdminAction(token, selectedFriday)
      .then((result) => {
        if (!active) return;
        if (!result.success) {
          setEditorState({
            date: selectedFriday,
            form: EMPTY_FORM,
            published: false,
            loadStatus: "error",
          });
          return;
        }
        const khutbah = result.khutbah;
        setEditorState({
          date: selectedFriday,
          form: {
            titleAr: khutbah?.titleAr || "",
            contentAr: khutbah?.contentAr || "",
            titleEn: khutbah?.titleEn || "",
            contentEn: khutbah?.contentEn || "",
            titleDe: khutbah?.titleDe || "",
            contentDe: khutbah?.contentDe || "",
            titleTr: khutbah?.titleTr || "",
            contentTr: khutbah?.contentTr || "",
          },
          published: Boolean(khutbah?.published),
          loadStatus: "ready",
        });
      })
      .catch(() => {
        if (!active) return;
        setEditorState({
          date: selectedFriday,
          form: EMPTY_FORM,
          published: false,
          loadStatus: "error",
        });
      });

    return () => { active = false; };
  }, [selectedFriday, token]);

  const active = useMemo(
    () => LANGUAGES.find((language) => language.code === activeLanguage) || LANGUAGES[0],
    [activeLanguage],
  );

  function setError(message: string) {
    setErrorState(message ? { date: selectedFriday, message } : null);
  }

  function setSuccess(message: string) {
    setSuccessState(message ? { date: selectedFriday, message } : null);
  }

  function setField(key: keyof FridayKhutbahForm, value: string) {
    setEditorState((current) => {
      const currentForm = current?.date === selectedFriday ? current.form : EMPTY_FORM;
      const currentPublished = current?.date === selectedFriday ? current.published : false;
      return {
        date: selectedFriday,
        form: { ...currentForm, [key]: value },
        published: currentPublished,
        loadStatus: "ready",
      };
    });
    setError("");
    setSuccess("");
  }

  function save(publish: boolean) {
    if (!selectedFriday || !token) return;
    setError("");
    setSuccess("");
    if (publish && !hasPublishableKhutbahContent(form)) {
      setError(copy.publishRequiresContent);
      return;
    }

    startTransition(async () => {
      const result = await saveFridayKhutbahAction(token, selectedFriday, form, publish);
      if (!result.success) {
        setError(result.error === "khutbahContentRequired" ? copy.publishRequiresContent : copy.saveFailed);
        return;
      }
      setEditorState((current) => ({
        date: selectedFriday,
        form: current?.date === selectedFriday ? current.form : form,
        published: Boolean(result.khutbah.published),
        loadStatus: "ready",
      }));
      setSuccess(publish ? copy.published : copy.saved);
    });
  }

  function unpublish() {
    if (!selectedFriday || !token) return;
    setError("");
    setSuccess("");
    startTransition(async () => {
      const result = await unpublishFridayKhutbahAction(token, selectedFriday);
      if (!result.success) {
        setError(copy.saveFailed);
        return;
      }
      setEditorState((current) => ({
        date: selectedFriday,
        form: current?.date === selectedFriday ? current.form : form,
        published: false,
        loadStatus: "ready",
      }));
      setSuccess(copy.unpublished);
    });
  }

  const controlsDisabled = disabled || loading || loadFailed || isPending || !selectedFriday || !token;

  return (
    <Card data-testid="friday-khutbah-editor">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-extrabold text-[var(--color-emerald)]">{copy.heading}</h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-[var(--color-muted)]">{copy.help}</p>
          {selectedFriday ? <p className="mt-1 text-xs font-bold text-[var(--color-muted)]">{selectedFriday}</p> : null}
        </div>
        <span className="rounded-full border border-[var(--color-border)] px-3 py-1 text-xs font-bold text-[var(--color-muted)]">
          {published ? copy.statusPublished : copy.statusDraft}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap gap-2" role="tablist" aria-label={copy.heading}>
        {LANGUAGES.map((language) => (
          <button
            key={language.code}
            type="button"
            role="tab"
            aria-selected={activeLanguage === language.code}
            onClick={() => setLanguageSelection({ locale, language: language.code })}
            className={`min-h-11 rounded-xl border px-4 text-sm font-bold ${activeLanguage === language.code ? "border-[var(--color-emerald)] bg-[var(--color-emerald-soft)] text-[var(--color-emerald)]" : "border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-charcoal)]"}`}
          >
            {language.label}
          </button>
        ))}
      </div>

      {loading ? <p className="mt-4 text-sm text-[var(--color-muted)]">{copy.loading}</p> : null}
      {loadFailed ? <p role="alert" className="mt-4 text-sm font-bold text-[var(--color-danger)]">{copy.loadFailed}</p> : null}

      <div role="tabpanel" className="mt-4 grid gap-4" dir={active.direction}>
        <label className="grid gap-1 text-sm font-bold text-[var(--color-emerald)]">
          {copy.title}
          <input
            type="text"
            data-khutbah-field="title"
            value={form[active.titleKey]}
            onChange={(event) => setField(active.titleKey, event.target.value)}
            disabled={controlsDisabled}
            className="min-h-11 rounded-2xl border border-[var(--color-border)] bg-[var(--color-cream)] px-3 text-[var(--color-charcoal)] outline-none focus:border-[var(--color-gold)] disabled:opacity-50"
          />
        </label>
        <label className="grid gap-1 text-sm font-bold text-[var(--color-emerald)]">
          {copy.content}
          <textarea
            data-khutbah-field="content"
            rows={12}
            value={form[active.contentKey]}
            onChange={(event) => setField(active.contentKey, event.target.value)}
            disabled={controlsDisabled}
            className="min-h-56 resize-y rounded-2xl border border-[var(--color-border)] bg-[var(--color-cream)] px-3 py-3 text-[var(--color-charcoal)] outline-none focus:border-[var(--color-gold)] disabled:opacity-50"
          />
        </label>
      </div>

      {error ? <p role="alert" className="mt-4 text-sm font-bold text-[var(--color-danger)]">{error}</p> : null}
      {success ? <p role="status" className="mt-4 text-sm font-bold text-[var(--color-success)]">{success}</p> : null}

      <div className="mt-5 flex flex-wrap gap-3">
        <Button
          type="button"
          variant="ghost"
          data-testid="khutbah-save-draft"
          onClick={() => save(false)}
          disabled={controlsDisabled}
        >
          {copy.saveDraft}
        </Button>
        <Button
          type="button"
          data-testid="khutbah-publish"
          onClick={() => save(true)}
          disabled={controlsDisabled}
        >
          {copy.publish}
        </Button>
        {published ? (
          <Button type="button" variant="ghost" onClick={unpublish} disabled={controlsDisabled}>
            {copy.unpublish}
          </Button>
        ) : null}
      </div>
    </Card>
  );
}
