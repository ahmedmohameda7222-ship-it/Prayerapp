"use client";

import { useEffect, useRef, useState } from "react";
import { BellRing, Volume2 } from "lucide-react";
import { useAdhanAudio } from "@/components/providers/AdhanAudioProvider";
import { useAppPreferences } from "@/components/providers/AppPreferencesProvider";
import { getAdhanSoundLabel, type AdhanPrayer } from "@/lib/adhan-audio";
import type { Locale } from "@/lib/i18n/types";
import { useTranslation } from "@/lib/i18n/use-translation";

const PRAYERS: readonly AdhanPrayer[] = ["fajr", "dhuhr", "asr", "maghrib", "isha"];
const TEST_SECONDS = 10;

type Copy = {
  title: string;
  description: string;
  prayer: string;
  selectedAdhan: string;
  testAdhan: string;
  testPush: string;
  adhanScheduled: string;
  adhanPlaying: string;
  adhanFailed: string;
  pushScheduled: string;
  pushSent: string;
  pushFailed: string;
  backgroundNote: string;
};

const COPY: Record<Locale, Copy> = {
  ar: {
    title: "اختبار الأذان والإشعارات",
    description: "اختر الصلاة ثم اختبر نفس الأذان المحفوظ والإشعار الحقيقي بعد 10 ثوانٍ.",
    prayer: "الصلاة",
    selectedAdhan: "الأذان المحفوظ",
    testAdhan: "اختبار الأذان",
    testPush: "اختبار الإشعار",
    adhanScheduled: "محاكاة الأذان بدأت. سيحاول التشغيل بعد 10 ثوانٍ.",
    adhanPlaying: "بدأ تشغيل الأذان من مسار التشغيل الحقيقي.",
    adhanFailed: "تعذر تشغيل الأذان على هذا الجهاز أو في حالة التطبيق الحالية.",
    pushScheduled: "تم إرسال طلب الاختبار للسيرفر. سيصل Push حقيقي بعد 10 ثوانٍ.",
    pushSent: "تم إرسال Push الاختبار بنجاح.",
    pushFailed: "فشل اختبار Push. راجع إذن الإشعارات واتصال الجهاز.",
    backgroundNote: "اختبار Push حقيقي ويمكنك بعد الضغط وضع التطبيق في الخلفية أو قفل الشاشة. اختبار الأذان يستخدم نفس المشغل الحقيقي، لكن أنظمة iOS/Android قد تمنع بدء صوت جديد إذا كان تطبيق الويب مغلقًا أو موقوفًا بالكامل في الخلفية.",
  },
  en: {
    title: "Adhan & notification test",
    description: "Choose a prayer, then test its saved Adhan and a real push notification after 10 seconds.",
    prayer: "Prayer",
    selectedAdhan: "Saved Adhan",
    testAdhan: "Test Adhan",
    testPush: "Test push",
    adhanScheduled: "Adhan simulation started. Playback will be attempted after 10 seconds.",
    adhanPlaying: "Adhan playback started through the real playback path.",
    adhanFailed: "Adhan playback was blocked or failed in the current device/app state.",
    pushScheduled: "The server test was started. A real Web Push will be sent after 10 seconds.",
    pushSent: "The test push was sent successfully.",
    pushFailed: "Push test failed. Check notification permission and device connectivity.",
    backgroundNote: "The push test is real, so you can background the app or lock the screen after tapping it. The Adhan test uses the real player, but iOS/Android can block new audio when a web app is fully closed or suspended in the background.",
  },
  de: {
    title: "Adhan- und Benachrichtigungstest",
    description: "Wähle ein Gebet und teste den gespeicherten Adhan sowie eine echte Push-Benachrichtigung nach 10 Sekunden.",
    prayer: "Gebet",
    selectedAdhan: "Gespeicherter Adhan",
    testAdhan: "Adhan testen",
    testPush: "Push testen",
    adhanScheduled: "Adhan-Simulation gestartet. Die Wiedergabe wird nach 10 Sekunden versucht.",
    adhanPlaying: "Der Adhan wurde über den echten Wiedergabepfad gestartet.",
    adhanFailed: "Die Adhan-Wiedergabe wurde im aktuellen Geräte-/App-Zustand blockiert oder ist fehlgeschlagen.",
    pushScheduled: "Der Servertest wurde gestartet. Nach 10 Sekunden wird ein echter Web Push gesendet.",
    pushSent: "Der Test-Push wurde erfolgreich gesendet.",
    pushFailed: "Push-Test fehlgeschlagen. Prüfe Benachrichtigungsberechtigung und Verbindung.",
    backgroundNote: "Der Push-Test ist echt; danach kannst du die App in den Hintergrund legen oder das Display sperren. Der Adhan-Test nutzt den echten Player, aber iOS/Android kann neuen Ton blockieren, wenn eine Web-App vollständig geschlossen oder im Hintergrund angehalten ist.",
  },
  tr: {
    title: "Ezan ve bildirim testi",
    description: "Bir namaz seçin; kaydedilmiş ezanı ve gerçek push bildirimini 10 saniye sonra test edin.",
    prayer: "Namaz",
    selectedAdhan: "Kayıtlı ezan",
    testAdhan: "Ezanı test et",
    testPush: "Push'u test et",
    adhanScheduled: "Ezan simülasyonu başladı. 10 saniye sonra oynatma denenecek.",
    adhanPlaying: "Ezan gerçek oynatma yolu üzerinden başladı.",
    adhanFailed: "Mevcut cihaz/uygulama durumunda ezan oynatma engellendi veya başarısız oldu.",
    pushScheduled: "Sunucu testi başladı. 10 saniye sonra gerçek Web Push gönderilecek.",
    pushSent: "Test push bildirimi başarıyla gönderildi.",
    pushFailed: "Push testi başarısız oldu. Bildirim iznini ve cihaz bağlantısını kontrol edin.",
    backgroundNote: "Push testi gerçektir; düğmeye bastıktan sonra uygulamayı arka plana alabilir veya ekranı kilitleyebilirsiniz. Ezan testi gerçek oynatıcıyı kullanır, ancak iOS/Android web uygulaması tamamen kapalı veya askıya alınmışken yeni sesi engelleyebilir.",
  },
};

function useCountdown() {
  const [seconds, setSeconds] = useState<number | null>(null);
  const intervalRef = useRef<number | null>(null);

  function start(durationSeconds: number) {
    if (intervalRef.current !== null) window.clearInterval(intervalRef.current);
    const endAt = Date.now() + durationSeconds * 1000;
    setSeconds(durationSeconds);
    intervalRef.current = window.setInterval(() => {
      const next = Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
      setSeconds(next);
      if (next === 0 && intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }, 250);
  }

  function finish() {
    if (intervalRef.current !== null) window.clearInterval(intervalRef.current);
    intervalRef.current = null;
    setSeconds(null);
  }

  useEffect(() => () => {
    if (intervalRef.current !== null) window.clearInterval(intervalRef.current);
  }, []);

  return { seconds, start, finish };
}

export function PrayerSystemTestControls() {
  const { t, locale } = useTranslation();
  const copy = COPY[locale];
  const {
    getPrayerSound,
    preloadSound,
    primeSound,
    previewSound,
    stopAudio,
  } = useAdhanAudio();
  const { sendTestNotification } = useAppPreferences();
  const [prayer, setPrayer] = useState<AdhanPrayer>("dhuhr");
  const [adhanStatus, setAdhanStatus] = useState("");
  const [pushStatus, setPushStatus] = useState("");
  const adhanCountdown = useCountdown();
  const pushCountdown = useCountdown();
  const adhanTimerRef = useRef<number | null>(null);

  const soundId = getPrayerSound(prayer);

  useEffect(() => {
    preloadSound(soundId);
  }, [preloadSound, soundId]);

  useEffect(() => () => {
    if (adhanTimerRef.current !== null) window.clearTimeout(adhanTimerRef.current);
    stopAudio();
  }, [stopAudio]);

  function startAdhanTest() {
    if (adhanCountdown.seconds !== null) return;
    stopAudio();
    preloadSound(soundId);
    void primeSound(soundId);
    setAdhanStatus(copy.adhanScheduled);
    adhanCountdown.start(TEST_SECONDS);

    adhanTimerRef.current = window.setTimeout(() => {
      adhanTimerRef.current = null;
      void previewSound(soundId).then((started) => {
        setAdhanStatus(started ? copy.adhanPlaying : copy.adhanFailed);
        adhanCountdown.finish();
      });
    }, TEST_SECONDS * 1000);
  }

  function startPushTest() {
    if (pushCountdown.seconds !== null) return;
    setPushStatus(copy.pushScheduled);
    pushCountdown.start(TEST_SECONDS);
    void sendTestNotification(TEST_SECONDS).then((sent) => {
      setPushStatus(sent ? copy.pushSent : copy.pushFailed);
      pushCountdown.finish();
    });
  }

  return (
    <section id="prayer-system-test" className="settings-section scroll-mt-24" data-testid="prayer-system-test">
      <h2>{copy.title}</h2>
      <p className="mt-1 text-sm leading-6 text-[var(--app-text-secondary)]">{copy.description}</p>

      <label className="mt-4 block text-sm font-bold text-[var(--app-text)]" htmlFor="prayer-test-select">{copy.prayer}</label>
      <select
        id="prayer-test-select"
        value={prayer}
        onChange={(event) => setPrayer(event.target.value as AdhanPrayer)}
        className="mt-2 min-h-12 w-full rounded-[12px] border border-[var(--app-border)] bg-[var(--app-surface)] px-3 text-sm font-semibold text-[var(--app-text)]"
      >
        {PRAYERS.map((name) => <option key={name} value={name}>{t(`prayer.${name}`)}</option>)}
      </select>

      <div className="mt-3 rounded-[12px] bg-[var(--app-surface-soft)] p-3">
        <p className="text-xs font-semibold text-[var(--app-text-secondary)]">{copy.selectedAdhan}</p>
        <p className="mt-1 text-sm font-bold text-[var(--app-text)]">{getAdhanSoundLabel(soundId, locale)}</p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={startAdhanTest}
          disabled={adhanCountdown.seconds !== null}
          className="flex min-h-12 items-center justify-center gap-2 rounded-[12px] bg-[var(--app-brand)] px-3 text-sm font-extrabold text-white disabled:opacity-60"
        >
          <Volume2 className="h-4 w-4" aria-hidden="true" />
          {adhanCountdown.seconds !== null ? `${adhanCountdown.seconds}s` : copy.testAdhan}
        </button>
        <button
          type="button"
          onClick={startPushTest}
          disabled={pushCountdown.seconds !== null}
          className="flex min-h-12 items-center justify-center gap-2 rounded-[12px] border border-[var(--app-brand)] bg-[var(--app-surface)] px-3 text-sm font-extrabold text-[var(--app-brand-strong)] disabled:opacity-60"
        >
          <BellRing className="h-4 w-4" aria-hidden="true" />
          {pushCountdown.seconds !== null ? `${pushCountdown.seconds}s` : copy.testPush}
        </button>
      </div>

      {adhanStatus ? <p className="mt-3 text-xs font-semibold leading-5 text-[var(--app-text-secondary)]" role="status">{adhanStatus}</p> : null}
      {pushStatus ? <p className="mt-2 text-xs font-semibold leading-5 text-[var(--app-text-secondary)]" role="status">{pushStatus}</p> : null}
      <p className="mt-4 rounded-[12px] bg-[var(--app-surface-soft)] p-3 text-xs leading-5 text-[var(--app-text-secondary)]">{copy.backgroundNote}</p>
    </section>
  );
}
