"use client";

import { useEffect, useRef, useState } from "react";
import { BellRing, Volume2 } from "lucide-react";
import { useAdhanAudio } from "@/components/providers/AdhanAudioProvider";
import { useAppPreferences } from "@/components/providers/AppPreferencesProvider";
import { useNativeAndroid } from "@/components/providers/NativeAndroidProvider";
import { getAdhanSoundLabel, type AdhanPrayer } from "@/lib/adhan-audio";
import type { Locale } from "@/lib/i18n/types";
import { useTranslation } from "@/lib/i18n/use-translation";

const PRAYERS: readonly AdhanPrayer[] = ["fajr", "dhuhr", "asr", "maghrib", "isha"];
const TEST_SECONDS = 10;
const TEST_REMINDER_MINUTES = 15;

type Copy = {
  title: string;
  description: string;
  prayer: string;
  selectedAdhan: string;
  testAdhan: string;
  testReminder: string;
  adhanScheduled: string;
  adhanTriggered: string;
  adhanFailed: string;
  reminderScheduled: string;
  reminderSent: string;
  reminderFailed: string;
  backgroundNote: string;
};

const COPY: Record<Locale, Copy> = {
  ar: {
    title: "محاكاة الصلاة الحقيقية",
    description: "اختر الصلاة. اختبار الأذان يحاكي أن وقت الأذان دخل الآن، واختبار التذكير يحاكي أن المتبقي 15 دقيقة على الأذان.",
    prayer: "الصلاة",
    selectedAdhan: "الأذان الذي سيعمل",
    testAdhan: "محاكاة دخول الأذان",
    testReminder: "محاكاة تذكير 15 دقيقة",
    adhanScheduled: "بدأ العد. بعد 10 ثوانٍ سيتعامل النظام كأن وقت أذان الصلاة المختارة دخل الآن.",
    adhanTriggered: "تم إطلاق حدث الأذان الحقيقي للصلاة المختارة. إذا سمح الجهاز بالتشغيل، سيبدأ الأذان المحفوظ نفسه.",
    adhanFailed: "تعذر إطلاق حدث الأذان على هذا الجهاز. راجع الإشعارات واتصال الجهاز.",
    reminderScheduled: "بدأ العد. بعد 10 ثوانٍ سيتعامل النظام كأن المتبقي 15 دقيقة على أذان الصلاة المختارة.",
    reminderSent: "تم إطلاق تذكير الصلاة الحقيقي بصيغة: متبقي 15 دقيقة على الأذان.",
    reminderFailed: "تعذر إرسال تذكير الصلاة الحقيقي. راجع إذن الإشعارات واتصال الجهاز.",
    backgroundNote: "هذه ليست رسائل Test منفصلة. الزران يستخدمان نفس مسار إرسال أحداث الصلاة الذي يستخدمه النظام الحقيقي. محاكاة الأذان ترسل حدث Adhan الحقيقي ثم يحاول التطبيق تشغيل نفس الأذان المحفوظ للصلاة. محاكاة التذكير ترسل نفس تذكير الصلاة الحقيقي قبل الأذان بـ15 دقيقة. يمكنك الضغط ثم وضع التطبيق في الخلفية أو قفل الشاشة لاختبار السلوك الفعلي للجهاز.",
  },
  en: {
    title: "Real prayer simulation",
    description: "Choose a prayer. The Adhan simulation treats its Adhan time as due now; the reminder simulation treats it as 15 minutes away.",
    prayer: "Prayer",
    selectedAdhan: "Adhan that will play",
    testAdhan: "Simulate Adhan now",
    testReminder: "Simulate 15-min reminder",
    adhanScheduled: "Countdown started. In 10 seconds the system will behave as if the selected prayer's Adhan time is due now.",
    adhanTriggered: "The real Adhan event was triggered for the selected prayer. If the device allows playback, the saved Adhan itself will start.",
    adhanFailed: "The real Adhan event could not be triggered on this device. Check notifications and connectivity.",
    reminderScheduled: "Countdown started. In 10 seconds the system will behave as if the selected prayer is 15 minutes away.",
    reminderSent: "The real 15-minute prayer reminder was triggered.",
    reminderFailed: "The real prayer reminder could not be sent. Check notification permission and connectivity.",
    backgroundNote: "These are not separate test messages. Both buttons use the same prayer-event delivery path as production. The Adhan simulation sends the real Adhan event and then the app attempts the saved Adhan for that prayer. The reminder simulation sends the same real 15-minute prayer reminder. You can background the app or lock the screen after tapping to test the device's real behavior.",
  },
  de: {
    title: "Echte Gebetssimulation",
    description: "Wähle ein Gebet. Die Adhan-Simulation behandelt die Adhan-Zeit als jetzt fällig; die Erinnerung simuliert 15 Minuten bis zum Adhan.",
    prayer: "Gebet",
    selectedAdhan: "Adhan, der abgespielt wird",
    testAdhan: "Adhan jetzt simulieren",
    testReminder: "15-Min.-Erinnerung simulieren",
    adhanScheduled: "Countdown gestartet. In 10 Sekunden verhält sich das System so, als wäre die Adhan-Zeit des gewählten Gebets jetzt erreicht.",
    adhanTriggered: "Das echte Adhan-Ereignis wurde ausgelöst. Wenn das Gerät Wiedergabe erlaubt, startet derselbe gespeicherte Adhan.",
    adhanFailed: "Das echte Adhan-Ereignis konnte auf diesem Gerät nicht ausgelöst werden. Prüfe Benachrichtigungen und Verbindung.",
    reminderScheduled: "Countdown gestartet. In 10 Sekunden verhält sich das System so, als wären noch 15 Minuten bis zum gewählten Gebet.",
    reminderSent: "Die echte 15-Minuten-Gebetserinnerung wurde ausgelöst.",
    reminderFailed: "Die echte Gebetserinnerung konnte nicht gesendet werden. Prüfe Berechtigung und Verbindung.",
    backgroundNote: "Dies sind keine separaten Testnachrichten. Beide Schaltflächen verwenden denselben Gebetsereignis-Pfad wie die Produktion. Die Adhan-Simulation sendet das echte Adhan-Ereignis und die App versucht anschließend denselben gespeicherten Adhan abzuspielen. Die Erinnerung sendet dieselbe echte 15-Minuten-Gebetserinnerung. Du kannst die App danach in den Hintergrund legen oder das Display sperren.",
  },
  tr: {
    title: "Gerçek namaz simülasyonu",
    description: "Bir namaz seçin. Ezan simülasyonu ezan vaktini şimdi gelmiş gibi; hatırlatma ise ezana 15 dakika kalmış gibi çalıştırır.",
    prayer: "Namaz",
    selectedAdhan: "Çalacak ezan",
    testAdhan: "Ezan vaktini şimdi simüle et",
    testReminder: "15 dk hatırlatmayı simüle et",
    adhanScheduled: "Geri sayım başladı. 10 saniye sonra sistem seçilen namazın ezan vakti şimdi gelmiş gibi davranacak.",
    adhanTriggered: "Gerçek ezan olayı tetiklendi. Cihaz izin verirse kayıtlı ezanın kendisi başlayacak.",
    adhanFailed: "Gerçek ezan olayı bu cihazda tetiklenemedi. Bildirimleri ve bağlantıyı kontrol edin.",
    reminderScheduled: "Geri sayım başladı. 10 saniye sonra sistem seçilen namaza 15 dakika kalmış gibi davranacak.",
    reminderSent: "Gerçek 15 dakikalık namaz hatırlatması tetiklendi.",
    reminderFailed: "Gerçek namaz hatırlatması gönderilemedi. Bildirim iznini ve bağlantıyı kontrol edin.",
    backgroundNote: "Bunlar ayrı test mesajları değildir. İki düğme de üretimdeki gerçek namaz olayı gönderim yolunu kullanır. Ezan simülasyonu gerçek Adhan olayını gönderir ve uygulama o namaz için kayıtlı ezanı çalmayı dener. Hatırlatma simülasyonu aynı gerçek 15 dakikalık namaz hatırlatmasını gönderir. Gerçek cihaz davranışını görmek için düğmeye bastıktan sonra uygulamayı arka plana alabilir veya ekranı kilitleyebilirsiniz.",
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
    stopAudio,
  } = useAdhanAudio();
  const { sendTestPrayerReminder, sendTestAdhan } = useAppPreferences();
  const { isNative, scheduleTest } = useNativeAndroid();
  const [prayer, setPrayer] = useState<AdhanPrayer>("maghrib");
  const [adhanStatus, setAdhanStatus] = useState("");
  const [reminderStatus, setReminderStatus] = useState("");
  const adhanCountdown = useCountdown();
  const reminderCountdown = useCountdown();

  const soundId = getPrayerSound(prayer);

  useEffect(() => {
    preloadSound(soundId);
  }, [preloadSound, soundId]);

  useEffect(() => () => stopAudio(), [stopAudio]);

  function startAdhanTest() {
    if (adhanCountdown.seconds !== null) return;
    stopAudio();
    if (!isNative) {
      preloadSound(soundId);
      void primeSound(soundId);
    }
    setAdhanStatus(copy.adhanScheduled);
    adhanCountdown.start(TEST_SECONDS);

    if (isNative) {
      void scheduleTest("adhan", prayer, soundId).then((scheduled) => {
        if (!scheduled) {
          setAdhanStatus(copy.adhanFailed);
          adhanCountdown.finish();
          return;
        }
        window.setTimeout(() => {
          setAdhanStatus(copy.adhanTriggered);
          adhanCountdown.finish();
        }, TEST_SECONDS * 1000);
      });
    } else {
      void sendTestAdhan(prayer, TEST_SECONDS).then((sent) => {
        setAdhanStatus(sent ? copy.adhanTriggered : copy.adhanFailed);
        adhanCountdown.finish();
      });
    }
  }

  function startReminderTest() {
    if (reminderCountdown.seconds !== null) return;
    setReminderStatus(copy.reminderScheduled);
    reminderCountdown.start(TEST_SECONDS);
    if (isNative) {
      void scheduleTest("reminder", prayer, soundId).then((scheduled) => {
        if (!scheduled) {
          setReminderStatus(copy.reminderFailed);
          reminderCountdown.finish();
          return;
        }
        window.setTimeout(() => {
          setReminderStatus(copy.reminderSent);
          reminderCountdown.finish();
        }, TEST_SECONDS * 1000);
      });
    } else {
      void sendTestPrayerReminder(prayer, TEST_SECONDS).then((sent) => {
        setReminderStatus(sent ? copy.reminderSent : copy.reminderFailed);
        reminderCountdown.finish();
      });
    }
  }

  return (
    <section
      id="prayer-system-test"
      className="settings-section scroll-mt-24"
      data-testid="prayer-system-test"
      data-reminder-minutes={TEST_REMINDER_MINUTES}
    >
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
          onClick={startReminderTest}
          disabled={reminderCountdown.seconds !== null}
          className="flex min-h-12 items-center justify-center gap-2 rounded-[12px] border border-[var(--app-brand)] bg-[var(--app-surface)] px-3 text-sm font-extrabold text-[var(--app-brand-strong)] disabled:opacity-60"
        >
          <BellRing className="h-4 w-4" aria-hidden="true" />
          {reminderCountdown.seconds !== null ? `${reminderCountdown.seconds}s` : copy.testReminder}
        </button>
      </div>

      {adhanStatus ? <p className="mt-3 text-xs font-semibold leading-5 text-[var(--app-text-secondary)]" role="status">{adhanStatus}</p> : null}
      {reminderStatus ? <p className="mt-2 text-xs font-semibold leading-5 text-[var(--app-text-secondary)]" role="status">{reminderStatus}</p> : null}
      <p className="mt-4 rounded-[12px] bg-[var(--app-surface-soft)] p-3 text-xs leading-5 text-[var(--app-text-secondary)]">{copy.backgroundNote}</p>
    </section>
  );
}
