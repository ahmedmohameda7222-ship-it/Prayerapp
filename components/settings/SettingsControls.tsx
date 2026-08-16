"use client";

import Link from "next/link";
import { Bell, Check, ChevronRight, Clock, Play, Square, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useTranslation } from "@/lib/i18n/use-translation";
import type { Locale } from "@/lib/i18n/types";
import { ADHAN_SOUNDS, type AdhanSoundId } from "@/lib/adhan-audio";
import { useTimeFormat } from "@/components/providers/TimeFormatProvider";
import { useAppPreferences } from "@/components/providers/AppPreferencesProvider";
import { useAdhanAudio } from "@/components/providers/AdhanAudioProvider";

const timeFormatOptions = [
  { value: "24-hour" as const, labelKey: "settings.24hour" },
  { value: "12-hour" as const, labelKey: "settings.12hour" },
];

const ADHAN_COPY: Record<Locale, {
  title: string;
  description: string;
  systemOnly: string;
  systemOnlyDetail: string;
  sound1: string;
  sound2: string;
  preview: string;
  stop: string;
  selected: string;
  foregroundNote: string;
  blocked: string;
  error: string;
  source: string;
}> = {
  ar: {
    title: "صوت الأذان",
    description: "لأي صلاة فعّلت تذكيرها، اختر هل تريد الاكتفاء بصوت إشعار الجهاز أو تشغيل أذان كامل عندما يكون التطبيق مفتوحًا وقت الأذان.",
    systemOnly: "صوت إشعار الجهاز فقط",
    systemOnlyDetail: "لن يشغّل التطبيق تسجيل أذان كامل.",
    sound1: "أذان 1",
    sound2: "أذان 2",
    preview: "معاينة",
    stop: "إيقاف",
    selected: "محدد",
    foregroundNote: "عندما يكون التطبيق في الخلفية أو الشاشة مقفلة، نظام iPhone/Android هو الذي يتحكم في صوت Push. لذلك الأذان الكامل داخل التطبيق يعمل فقط عندما تكون الصفحة مفتوحة، بينما يظل إشعار موعد الأذان يصل بصوت الجهاز.",
    blocked: "المتصفح منع تشغيل الصوت تلقائيًا. اضغط «معاينة» مرة واحدة على هذا الجهاز ثم اترك الصوت المختار مفعّلًا.",
    error: "تعذر تشغيل تسجيل الأذان. تحقق من الاتصال وحاول المعاينة مرة أخرى.",
    source: "المصدر",
  },
  en: {
    title: "Adhan sound",
    description: "For prayers with reminders enabled, choose between the device notification sound only or a full Adhan while the app is open at Adhan time.",
    systemOnly: "Device notification sound only",
    systemOnlyDetail: "The app will not play a full Adhan recording.",
    sound1: "Adhan 1",
    sound2: "Adhan 2",
    preview: "Preview",
    stop: "Stop",
    selected: "Selected",
    foregroundNote: "When the app is in the background or the screen is locked, iPhone/Android controls Web Push sound. Full in-app Adhan therefore plays only while the page is open; the Adhan-time push still arrives using the device notification sound.",
    blocked: "The browser blocked automatic audio. Tap Preview once on this device, then leave your preferred Adhan selected.",
    error: "The Adhan recording could not be played. Check the connection and try Preview again.",
    source: "Source",
  },
  de: {
    title: "Adhan-Ton",
    description: "Für Gebete mit aktivierter Erinnerung kannst du nur den Geräte-Benachrichtigungston verwenden oder bei geöffneter App zur Adhan-Zeit einen vollständigen Adhan abspielen.",
    systemOnly: "Nur Geräte-Benachrichtigungston",
    systemOnlyDetail: "Die App spielt keine vollständige Adhan-Aufnahme ab.",
    sound1: "Adhan 1",
    sound2: "Adhan 2",
    preview: "Vorschau",
    stop: "Stoppen",
    selected: "Ausgewählt",
    foregroundNote: "Wenn die App im Hintergrund ist oder der Bildschirm gesperrt ist, steuert iPhone/Android den Web-Push-Ton. Der vollständige Adhan wird daher nur bei geöffneter Seite abgespielt; die Adhan-Benachrichtigung kommt weiterhin mit dem Geräteton.",
    blocked: "Der Browser hat die automatische Audiowiedergabe blockiert. Tippe einmal auf Vorschau und lasse anschließend deinen bevorzugten Adhan ausgewählt.",
    error: "Die Adhan-Aufnahme konnte nicht abgespielt werden. Prüfe die Verbindung und versuche die Vorschau erneut.",
    source: "Quelle",
  },
  tr: {
    title: "Ezan sesi",
    description: "Hatırlatıcısı açık namazlar için yalnızca cihaz bildirim sesini kullanabilir veya ezan vaktinde uygulama açıksa tam ezan çalmasını seçebilirsiniz.",
    systemOnly: "Yalnızca cihaz bildirim sesi",
    systemOnlyDetail: "Uygulama tam ezan kaydı çalmayacak.",
    sound1: "Ezan 1",
    sound2: "Ezan 2",
    preview: "Dinle",
    stop: "Durdur",
    selected: "Seçili",
    foregroundNote: "Uygulama arka plandayken veya ekran kilitliyken Web Push sesini iPhone/Android yönetir. Bu nedenle tam ezan yalnızca sayfa açıkken çalar; ezan vakti bildirimi cihazın bildirim sesiyle gelmeye devam eder.",
    blocked: "Tarayıcı otomatik sesi engelledi. Bu cihazda bir kez Dinle düğmesine dokunun ve tercih ettiğiniz ezanı seçili bırakın.",
    error: "Ezan kaydı oynatılamadı. Bağlantıyı kontrol edip tekrar deneyin.",
    source: "Kaynak",
  },
};

function soundName(soundId: AdhanSoundId, copy: typeof ADHAN_COPY[Locale]) {
  if (soundId === "system-only") return copy.systemOnly;
  return soundId === "adhan-1" ? copy.sound1 : copy.sound2;
}

export function SettingsControls() {
  const { t, locale } = useTranslation();
  const copy = ADHAN_COPY[locale];
  const { timeFormat, setTimeFormat } = useTimeFormat();
  const { pushStatus, busy, enableNotifications, disableNotifications } = useAppPreferences();
  const { soundId, playbackStatus, activeSoundId, setSoundId, previewSound, stopAudio } = useAdhanAudio();

  const statusKey = {
    checking: "settings.pushChecking",
    unsupported: "settings.pushUnsupported",
    "ios-install-required": "settings.pushIosInstallRequired",
    unconfigured: "settings.pushUnavailable",
    denied: "settings.pushDenied",
    disabled: "settings.pushDisabled",
    enabled: "settings.pushEnabled",
    error: "settings.pushError",
  }[pushStatus];

  return (
    <div id="prayer-reminders" className="settings-group scroll-mt-24">
      <section className="settings-section">
        <h2 className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-[var(--app-brand)]" aria-hidden="true" />
          {t("settings.notifications")}
        </h2>
        <p className="mt-1 text-sm leading-6">{t("settings.automaticContentNotifications")}</p>
        <p className="mt-3 rounded-[12px] bg-[var(--app-surface-soft)] p-3 text-sm font-semibold text-[var(--app-brand-strong)]" role="status">
          {t(statusKey)}
        </p>
        {pushStatus === "enabled" ? (
          <Button variant="ghost" className="mt-3 w-full" disabled={busy} onClick={() => void disableNotifications()}>{t("settings.disablePush")}</Button>
        ) : pushStatus === "disabled" || pushStatus === "error" ? (
          <Button className="mt-3 w-full" disabled={busy} onClick={() => void enableNotifications()}>{t("settings.enablePush")}</Button>
        ) : null}
      </section>

      <Link href="/#prayer-times" className="settings-section flex min-h-14 items-center gap-3">
        <Bell className="h-4 w-4 shrink-0 text-[var(--app-brand)]" aria-hidden="true" />
        <span className="min-w-0 flex-1 text-sm font-semibold text-[var(--app-text)]">{t("phase1.manageReminders")}</span>
        <ChevronRight className="h-4 w-4 shrink-0 text-[var(--app-text-secondary)] rtl:rotate-180" aria-hidden="true" />
      </Link>

      <section className="settings-section" data-testid="adhan-audio-settings">
        <h2 className="flex items-center gap-2">
          <Volume2 className="h-4 w-4 text-[var(--app-brand)]" aria-hidden="true" />
          {copy.title}
        </h2>
        <p className="mt-1 text-sm leading-6">{copy.description}</p>

        <div className="mt-4 overflow-hidden rounded-[14px] border border-[var(--app-divider)]">
          {ADHAN_SOUNDS.map((sound, index) => {
            const selected = sound.id === soundId;
            const playing = playbackStatus === "playing" && activeSoundId === sound.id;
            return (
              <div key={sound.id} className={`flex items-stretch bg-[var(--app-surface)] ${index ? "border-t border-[var(--app-divider)]" : ""}`}>
                <button
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setSoundId(sound.id)}
                  className={`min-h-[66px] min-w-0 flex-1 px-4 py-3 text-start ${selected ? "bg-[var(--app-surface-soft)]" : ""}`}
                >
                  <span className="flex items-center gap-2">
                    <span className={`min-w-0 flex-1 text-sm font-bold ${selected ? "text-[var(--app-brand-strong)]" : "text-[var(--app-text)]"}`}>{soundName(sound.id, copy)}</span>
                    {sound.durationLabel ? <span dir="ltr" className="text-xs font-semibold text-[var(--app-text-secondary)]">{sound.durationLabel}</span> : null}
                    {selected ? <Check className="h-4 w-4 shrink-0 text-[var(--app-brand)]" aria-label={copy.selected} /> : null}
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-[var(--app-text-secondary)]">
                    {sound.id === "system-only" ? copy.systemOnlyDetail : sound.sourceLabel}
                  </span>
                </button>

                {sound.id !== "system-only" ? (
                  <button
                    type="button"
                    aria-label={`${playing ? copy.stop : copy.preview}: ${soundName(sound.id, copy)}`}
                    onClick={() => playing ? stopAudio() : void previewSound(sound.id)}
                    className="grid w-14 shrink-0 place-items-center border-s border-[var(--app-divider)] text-[var(--app-brand)]"
                  >
                    {playing ? <Square className="h-4 w-4 fill-current" aria-hidden="true" /> : <Play className="h-5 w-5 fill-current" aria-hidden="true" />}
                  </button>
                ) : null}
              </div>
            );
          })}
        </div>

        {playbackStatus === "blocked" ? <p role="alert" className="mt-3 rounded-[12px] bg-amber-50 p-3 text-xs font-semibold leading-5 text-amber-900">{copy.blocked}</p> : null}
        {playbackStatus === "error" ? <p role="alert" className="mt-3 rounded-[12px] bg-red-50 p-3 text-xs font-semibold leading-5 text-red-800">{copy.error}</p> : null}
        <p className="mt-3 text-xs leading-5 text-[var(--app-text-secondary)]">{copy.foregroundNote}</p>
        {soundId !== "system-only" ? (
          <p className="mt-2 text-[11px] leading-5 text-[var(--app-text-secondary)]">
            {copy.source}: <a href={ADHAN_SOUNDS.find((sound) => sound.id === soundId)?.sourceUrl || "#"} target="_blank" rel="noreferrer" className="font-semibold text-[var(--app-brand-strong)] underline underline-offset-2">{ADHAN_SOUNDS.find((sound) => sound.id === soundId)?.sourceLabel}</a>
          </p>
        ) : null}
      </section>

      <section className="settings-section">
        <h2 className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-[var(--app-brand)]" aria-hidden="true" />
          {t("settings.timeFormat")}
        </h2>
        <div className="mt-3 grid grid-cols-2 gap-2 rounded-[14px] bg-[var(--app-surface-soft)] p-1.5">
          {timeFormatOptions.map((item) => (
            <button
              key={item.value}
              onClick={() => setTimeFormat(item.value)}
              aria-pressed={timeFormat === item.value}
              className={`min-h-11 rounded-[11px] px-3 text-sm font-semibold ${timeFormat === item.value ? "bg-[var(--app-surface)] text-[var(--app-brand-strong)] shadow-sm" : "text-[var(--app-text-secondary)]"}`}
            >
              {t(item.labelKey)}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
