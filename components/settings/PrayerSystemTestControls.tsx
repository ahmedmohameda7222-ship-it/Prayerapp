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
  adhanTriggered: string;
  adhanFailed: string;
  pushScheduled: string;
  pushSent: string;
  pushFailed: string;
  backgroundNote: string;
};

const COPY: Record<Locale, Copy> = {
  ar: {
    title: "اختبار الأذان والإشعارات",
    description: "اختر الصلاة ثم اختبر وصول الأذان الحقيقي والإشعار الحقيقي بعد 10 ثوانٍ.",
    prayer: "الصلاة",
    selectedAdhan: "الأذان المحفوظ",
    testAdhan: "اختبار الأذان",
    testPush: "اختبار الإشعار",
    adhanScheduled: "بدأ اختبار الأذان. بعد 10 ثوانٍ سيصل نفس trigger الأذان المستخدم وقت الصلاة.",
    adhanTriggered: "تم إرسال trigger الأذان الحقيقي للجهاز. التطبيق حاول تشغيل الأذان المحفوظ لهذه الصلاة.",
    adhanFailed: "فشل إرسال اختبار الأذان للجهاز. تأكد من إذن الإشعارات واتصال الجهاز.",
    pushScheduled: "بدأ اختبار الإشعار. سيصل Push حقيقي بعد 10 ثوانٍ.",
    pushSent: "تم إرسال Push الاختبار بنجاح.",
    pushFailed: "فشل اختبار Push. راجع إذن الإشعارات واتصال الجهاز.",
    backgroundNote: "الاختباران يستخدمان Web Push الحقيقي. اختبار الإشعار يختبر الإشعار فقط. اختبار الأذان يرسل trigger من نوع Adhan عبر Service Worker ثم يحاول تشغيل الأذان المحفوظ. يمكنك بعد الضغط وضع التطبيق في الخلفية أو قفل الشاشة. سيظهر إشعار أيضًا أثناء اختبار الأذان لأن Web Push في تطبيقات الويب يجب أن يكون مرئيًا للمستخدم، بينما تشغيل صوت مخصص قد يظل مقيدًا إذا أوقف النظام تطبيق الويب بالكامل.",
  },
  en: {
    title: "Adhan & notification test",
    description: "Choose a prayer, then test the real Adhan-arrival path and a real push notification after 10 seconds.",
    prayer: "Prayer",
    selectedAdhan: "Saved Adhan",
    testAdhan: "Test Adhan",
    testPush: "Test push",
    adhanScheduled: "Adhan test started. In 10 seconds the device will receive the same Adhan trigger used at prayer time.",
    adhanTriggered: "The real Adhan trigger was sent to this device. The app attempted the saved Adhan for this prayer.",
    adhanFailed: "The Adhan test could not be sent. Check notification permission and device connectivity.",
    pushScheduled: "Push test started. A real Web Push will be sent after 10 seconds.",
    pushSent: "The test push was sent successfully.",
    pushFailed: "Push test failed. Check notification permission and device connectivity.",
    backgroundNote: "Both tests use real Web Push. The push test checks the notification path only. The Adhan test sends an Adhan-kind trigger through the Service Worker and then attempts the saved Adhan. You can background the app or lock the screen after tapping. The Adhan test also shows a notification because web push must remain user-visible, while custom audio can still be restricted if the OS fully suspends the web app.",
  },
  de: {
    title: "Adhan- und Benachrichtigungstest",
    description: "Wähle ein Gebet und teste nach 10 Sekunden den echten Adhan-Ankunftspfad sowie eine echte Push-Benachrichtigung.",
    prayer: "Gebet",
    selectedAdhan: "Gespeicherter Adhan",
    testAdhan: "Adhan testen",
    testPush: "Push testen",
    adhanScheduled: "Adhan-Test gestartet. In 10 Sekunden erhält das Gerät denselben Adhan-Trigger wie zur Gebetszeit.",
    adhanTriggered: "Der echte Adhan-Trigger wurde an dieses Gerät gesendet. Die App hat den gespeicherten Adhan dieses Gebets versucht abzuspielen.",
    adhanFailed: "Der Adhan-Test konnte nicht gesendet werden. Prüfe Benachrichtigungsberechtigung und Verbindung.",
    pushScheduled: "Push-Test gestartet. Nach 10 Sekunden wird ein echter Web Push gesendet.",
    pushSent: "Der Test-Push wurde erfolgreich gesendet.",
    pushFailed: "Push-Test fehlgeschlagen. Prüfe Benachrichtigungsberechtigung und Verbindung.",
    backgroundNote: "Beide Tests verwenden echten Web Push. Der Push-Test prüft nur den Benachrichtigungspfad. Der Adhan-Test sendet einen Adhan-Trigger über den Service Worker und versucht anschließend den gespeicherten Adhan. Du kannst die App danach in den Hintergrund legen oder das Display sperren. Beim Adhan-Test erscheint ebenfalls eine Benachrichtigung, da Web Push sichtbar bleiben muss; benutzerdefiniertes Audio kann jedoch weiterhin blockiert werden, wenn das Betriebssystem die Web-App vollständig anhält.",
  },
  tr: {
    title: "Ezan ve bildirim testi",
    description: "Bir namaz seçin; 10 saniye sonra gerçek ezan-geliş yolunu ve gerçek push bildirimini test edin.",
    prayer: "Namaz",
    selectedAdhan: "Kayıtlı ezan",
    testAdhan: "Ezanı test et",
    testPush: "Push'u test et",
    adhanScheduled: "Ezan testi başladı. 10 saniye sonra cihaz namaz vaktinde kullanılan gerçek ezan tetikleyicisini alacak.",
    adhanTriggered: "Gerçek ezan tetikleyicisi bu cihaza gönderildi. Uygulama bu namaz için kayıtlı ezanı oynatmayı denedi.",
    adhanFailed: "Ezan testi gönderilemedi. Bildirim iznini ve cihaz bağlantısını kontrol edin.",
    pushScheduled: "Push testi başladı. 10 saniye sonra gerçek Web Push gönderilecek.",
    pushSent: "Test push bildirimi başarıyla gönderildi.",
    pushFailed: "Push testi başarısız oldu. Bildirim iznini ve cihaz bağlantısını kontrol edin.",
    backgroundNote: "Her iki test de gerçek Web Push kullanır. Push testi yalnızca bildirim yolunu test eder. Ezan testi Service Worker üzerinden Adhan türü tetikleyici gönderir ve ardından kayıtlı ezanı oynatmayı dener. Düğmeye bastıktan sonra uygulamayı arka plana alabilir veya ekranı kilitleyebilirsiniz. Web Push kullanıcıya görünür kalmak zorunda olduğundan ezan testinde de bildirim görünür; işletim sistemi web uygulamasını tamamen askıya alırsa özel ses yine kısıtlanabilir.",
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
  const { sendTestNotification, sendTestAdhan } = useAppPreferences();
  const [prayer, setPrayer] = useState<AdhanPrayer>("dhuhr");
  const [adhanStatus, setAdhanStatus] = useState("");
  const [pushStatus, setPushStatus] = useState("");
  const adhanCountdown = useCountdown();
  const pushCountdown = useCountdown();

  const soundId = getPrayerSound(prayer);

  useEffect(() => {
    preloadSound(soundId);
  }, [preloadSound, soundId]);

  useEffect(() => () => stopAudio(), [stopAudio]);

  function startAdhanTest() {
    if (adhanCountdown.seconds !== null) return;
    stopAudio();
    preloadSound(soundId);
    void primeSound(soundId);
    setAdhanStatus(copy.adhanScheduled);
    adhanCountdown.start(TEST_SECONDS);

    void sendTestAdhan(prayer, TEST_SECONDS).then((sent) => {
      setAdhanStatus(sent ? copy.adhanTriggered : copy.adhanFailed);
      adhanCountdown.finish();
    });
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
