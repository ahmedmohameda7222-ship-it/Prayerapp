(() => {
  "use strict";

  const NAMES = ["fajr", "sunrise", "dhuhr", "asr", "maghrib", "isha"];
  const LOCALE = /^(ar|de|tr)(?:-|$)/i.exec(navigator.language || "")?.[1]?.toLowerCase() || "en";
  const COPY = {
    ar: {
      title: "مواقيت الصلاة", subtitle: "محفوظة للاستخدام بدون إنترنت",
      noticeTitle: "وضع عدم الاتصال", noticeBody: "هذه نسخة محفوظة وقد تكون قديمة. التحديثات والخدمات التفاعلية تحتاج إلى إنترنت.",
      schedule: "مواقيت الصلاة", retry: "إعادة المحاولة", home: "فتح التطبيق",
      disclaimer: "هذه المواقيت المنشورة من المسجد وقت الحفظ. لا تعتمد على نسخة منتهية الصلاحية أو غير متاحة لتاريخ اليوم.",
      loading: "جارٍ تحميل المواقيت المحفوظة…", missing: "لا توجد مواقيت منشورة محفوظة لهذا اليوم. اتصل بالإنترنت للتحديث.",
      never: "لم تُحفظ مواقيت الصلاة على هذا الجهاز بعد. افتح التطبيق مرة واحدة مع وجود اتصال.",
      saved: "آخر حفظ", iqama: "الإقامة", friday: "الجمعة الأولى وفق وقت الظهر", previous: "اليوم السابق", next: "اليوم التالي",
      names: { fajr: "الفجر", sunrise: "الشروق", dhuhr: "الظهر", asr: "العصر", maghrib: "المغرب", isha: "العشاء" },
    },
    de: {
      title: "Gebetszeiten", subtitle: "Für die Offline-Nutzung gespeichert",
      noticeTitle: "Offline-Modus", noticeBody: "Dies ist eine gespeicherte Kopie und kann veraltet sein. Änderungen und interaktive Dienste benötigen Internet.",
      schedule: "Gebetszeiten", retry: "Erneut verbinden", home: "App öffnen",
      disclaimer: "Diese Zeiten stammen aus dem zuletzt gespeicherten veröffentlichten Moscheeplan. Prüfe die Aktualität nach längerer Offline-Zeit.",
      loading: "Gespeicherte Zeiten werden geladen…", missing: "Keine gespeicherten Gebetszeiten für diesen Tag. Bitte online aktualisieren.",
      never: "Auf diesem Gerät wurde noch kein Gebetsplan gespeichert. Öffne die App einmal online.",
      saved: "Zuletzt gespeichert", iqama: "Iqama", friday: "Erstes Freitagsgebet = Dhuhr", previous: "Vorheriger Tag", next: "Nächster Tag",
      names: { fajr: "Fadschr", sunrise: "Sonnenaufgang", dhuhr: "Dhuhr", asr: "Asr", maghrib: "Maghrib", isha: "Ischa" },
    },
    en: {
      title: "Prayer times", subtitle: "Saved for use without internet",
      noticeTitle: "Offline mode", noticeBody: "This is a saved copy and may be outdated. Updates and interactive services require internet.",
      schedule: "Prayer schedule", retry: "Retry connection", home: "Open app",
      disclaimer: "Times come from the last saved mosque-published timetable. Check their freshness after a long offline period.",
      loading: "Loading saved prayer times…", missing: "No published prayer times saved for this date. Reconnect to update.",
      never: "No prayer schedule has been saved on this device yet. Open the app online once.",
      saved: "Last saved", iqama: "Iqama", friday: "First Friday prayer = Dhuhr", previous: "Previous date", next: "Next date",
      names: { fajr: "Fajr", sunrise: "Sunrise", dhuhr: "Dhuhr", asr: "Asr", maghrib: "Maghrib", isha: "Isha" },
    },
    tr: {
      title: "Namaz vakitleri", subtitle: "Çevrimdışı kullanım için kaydedildi",
      noticeTitle: "Çevrimdışı mod", noticeBody: "Bu kayıtlı kopya güncel olmayabilir. Değişiklikler ve etkileşimli hizmetler internet gerektirir.",
      schedule: "Namaz vakitleri", retry: "Yeniden dene", home: "Uygulamayı aç",
      disclaimer: "Vakitler, caminin en son kaydedilen yayımlanmış takviminden alınmıştır. Uzun süre çevrimdışı kalınca güncelliğini kontrol edin.",
      loading: "Kaydedilen vakitler yükleniyor…", missing: "Bu tarih için kaydedilmiş namaz vakti yok. Güncellemek için internete bağlanın.",
      never: "Bu cihaza henüz namaz takvimi kaydedilmedi. Uygulamayı bir kez çevrimiçi açın.",
      saved: "Son kayıt", iqama: "Kamet", friday: "İlk cuma namazı = Öğle", previous: "Önceki gün", next: "Sonraki gün",
      names: { fajr: "İmsak / Sabah", sunrise: "Güneş", dhuhr: "Öğle", asr: "İkindi", maghrib: "Akşam", isha: "Yatsı" },
    },
  };
  const copy = COPY[LOCALE];
  const byId = (id) => document.getElementById(id);
  const setText = (id, value) => { byId(id).textContent = value; };
  let snapshot = null;
  let selectedDate = null;

  document.documentElement.lang = LOCALE;
  document.documentElement.dir = LOCALE === "ar" ? "rtl" : "ltr";
  for (const [id, value] of Object.entries({
    title: copy.title, subtitle: copy.subtitle,
    "notice-title": copy.noticeTitle, "notice-body": copy.noticeBody,
    "schedule-title": copy.schedule, retry: copy.retry, "back-home": copy.home,
    disclaimer: copy.disclaimer, "loading-message": copy.loading,
  })) setText(id, value);
  byId("previous-day").setAttribute("aria-label", copy.previous);
  byId("next-day").setAttribute("aria-label", copy.next);

  function mosqueToday(timezone) {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit",
    }).formatToParts(new Date());
    const data = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
    return data.year + "-" + data.month + "-" + data.day;
  }

  function readableDate(date) {
    return new Intl.DateTimeFormat(LOCALE, {
      timeZone: "UTC", weekday: "long", year: "numeric", month: "short", day: "numeric",
    }).format(new Date(date + "T12:00:00Z"));
  }

  function iqamaClock(time, delay) {
    const [hour, minute] = time.split(":").map(Number);
    const total = hour * 60 + minute + delay;
    const adjusted = total % 1440;
    return String(Math.floor(adjusted / 60)).padStart(2, "0") + ":" +
      String(adjusted % 60).padStart(2, "0") + (total >= 1440 ? " (+1)" : "");
  }

  function render() {
    const container = byId("prayers");
    container.replaceChildren();
    const rows = snapshot?.rows || [];
    const index = rows.findIndex(row => row.date === selectedDate);
    const current = index >= 0 ? rows[index] : null;
    byId("previous-day").disabled = index <= 0;
    byId("next-day").disabled = index < 0 || index >= rows.length - 1;
    setText("selected-day", selectedDate ? readableDate(selectedDate) : "—");

    if (!current) {
      const message = document.createElement("p");
      message.className = "empty";
      message.textContent = snapshot ? copy.missing : copy.never;
      container.append(message);
      return;
    }

    const isFriday = new Date(current.date + "T12:00:00Z").getUTCDay() === 5;
    for (const name of NAMES) {
      const row = document.createElement("div");
      row.className = "prayer-row";
      const prayer = document.createElement("span");
      prayer.className = "prayer";
      prayer.textContent = copy.names[name];
      const time = document.createElement("span");
      time.className = "time";
      time.textContent = current[name];
      const iqama = document.createElement("span");
      iqama.className = "iqama";
      const delay = snapshot.iqamaDelays?.[name];
      if (name !== "sunrise" && !(isFriday && name === "dhuhr") && Number.isInteger(delay) && delay >= 0) {
        const label = document.createElement("span");
        label.textContent = copy.iqama + " ";
        const clock = document.createElement("b");
        clock.textContent = iqamaClock(current[name], delay);
        iqama.append(label, clock);
      }
      row.append(prayer, time, iqama);
      container.append(row);
    }
    // Canonical primary Friday is always published Dhuhr; never invent extras.
    if (isFriday) {
      const friday = document.createElement("p");
      friday.className = "meta";
      friday.textContent = copy.friday;
      container.append(friday);
    }
  }

  async function loadSavedSchedule() {
    try {
      const response = await fetch("/api/offline/prayer-schedule", {
        method: "GET", cache: "no-store", credentials: "omit",
        headers: { accept: "application/json" },
      });
      if (!response.ok) throw new Error("offline-snapshot-unavailable");
      const value = await response.json();
      if (value?.schemaVersion !== 1 || !Array.isArray(value.rows) || typeof value.timezone !== "string") {
        throw new Error("offline-snapshot-invalid");
      }
      const today = mosqueToday(value.timezone);
      snapshot = value;
      if (!selectedDate || !value.rows.some(day => day.date === selectedDate)) selectedDate = today;
      const savedAt = new Date(value.fetchedAt);
      setText("updated-at", Number.isFinite(savedAt.getTime())
        ? copy.saved + ": " + new Intl.DateTimeFormat(LOCALE, {
          dateStyle: "medium", timeStyle: "short", timeZone: value.timezone,
        }).format(savedAt) + " (" + value.timezone + ")"
        : "");
    } catch {
      if (!snapshot) {
        snapshot = null;
        selectedDate = null;
        setText("updated-at", "");
      }
    }
    render();
  }

  byId("previous-day").addEventListener("click", () => {
    const index = snapshot?.rows.findIndex(row => row.date === selectedDate) ?? -1;
    if (index > 0) { selectedDate = snapshot.rows[index - 1].date; render(); }
  });
  byId("next-day").addEventListener("click", () => {
    const index = snapshot?.rows.findIndex(row => row.date === selectedDate) ?? -1;
    if (index >= 0 && index < snapshot.rows.length - 1) {
      selectedDate = snapshot.rows[index + 1].date; render();
    }
  });
  byId("retry").addEventListener("click", () => {
    if (navigator.onLine) window.location.href = "/";
    else void loadSavedSchedule();
  });
  window.addEventListener("online", () => { void loadSavedSchedule(); });
  void loadSavedSchedule();
})();
