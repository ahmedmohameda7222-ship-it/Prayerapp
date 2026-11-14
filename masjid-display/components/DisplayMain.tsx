import type { DisplayRuntimeViewModel } from "../lib/runtime/use-display-runtime";
import type { NormalSlide } from "../lib/scheduler";
import { isFridayIso, zonedDateTime } from "../lib/time";
import { AnnouncementSlide } from "./content/AnnouncementSlide";
import { AfterPrayerBoard } from "./content/AfterPrayerBoard";
import { AzkarSlide } from "./content/AzkarSlide";
import { CampaignSlide } from "./content/CampaignSlide";
import { EventSlide } from "./content/EventSlide";
import { MaghribProgramSlide } from "./content/MaghribProgramSlide";
import { SpecialDisplaySlide } from "./content/SpecialDisplaySlide";
import { FridayMode } from "./states/FridayMode";
import { IqamaNow } from "./states/IqamaNow";
import { JumuahNow } from "./states/JumuahNow";
import { PrayerApproaching } from "./states/PrayerApproaching";
import { PrayerInProgress } from "./states/PrayerInProgress";
import { PrayerTimeNow } from "./states/PrayerTimeNow";
import { WaitingForIqama } from "./states/WaitingForIqama";

function renderNormalSlide(vm: DisplayRuntimeViewModel, slide: NormalSlide | null) {
  if (!slide || !vm.content) return null;

  switch (slide.kind) {
    case "AZKAR": {
      const item = vm.content.azkar.find((entry) => entry.id === slide.itemId);
      return item ? <AzkarSlide item={item} language={slide.language} /> : null;
    }
    case "SPECIAL": {
      const item = vm.content.specialAnnouncements.find((entry) => entry.id === slide.itemId);
      return item ? <SpecialDisplaySlide item={item} now={vm.logicalNow} /> : null;
    }
    case "ANNOUNCEMENT": {
      const item = vm.content.announcements.find((entry) => entry.id === slide.itemId);
      return item ? <AnnouncementSlide item={item} now={vm.logicalNow} /> : null;
    }
    case "EVENT":
      return (
        <EventSlide
          items={vm.content.events}
          selectedId={slide.itemId}
          now={vm.logicalNow}
        />
      );
    case "CAMPAIGN":
      return (
        <CampaignSlide
          items={vm.content.campaigns}
          selectedId={slide.itemId}
          now={vm.logicalNow}
        />
      );
    case "MAGHRIB_PROGRAM": {
      const date = slide.itemId?.replace(/^maghrib-program:/, "") ?? "";
      const day = vm.content.maghribPrograms.find((entry) => entry.date === date);
      return day ? <MaghribProgramSlide day={day} /> : null;
    }
    default: {
      const exhaustive: never = slide.kind;
      return exhaustive;
    }
  }
}

function NextPrayerFallback({ vm }: { vm: DisplayRuntimeViewModel }) {
  const feed = vm.feed;
  const prayers = ["fajr", "dhuhr", "asr", "maghrib", "isha"] as const;
  const labels = {
    fajr: { ar: "الفجر", de: "Fajr" },
    dhuhr: { ar: "الظهر", de: "Dhuhr" },
    asr: { ar: "العصر", de: "Asr" },
    maghrib: { ar: "المغرب", de: "Maghrib" },
    isha: { ar: "العشاء", de: "Isha" },
  };
  const upcoming = feed?.prayers.schedule.flatMap((day) => prayers.map((prayer) => ({
    prayer, date: day.date, time: day[prayer],
    instant: zonedDateTime(day.date, day[prayer], feed.timezone).getTime(),
  })))
    .filter((entry) => entry.instant > vm.logicalNow.getTime())
    .sort((a,b) => a.instant - b.instant)[0];

  const de = upcoming
    ? upcoming.prayer === "dhuhr" && isFridayIso(upcoming.date) ? "Jumuah" : labels[upcoming.prayer].de
    : null;
  const ar = upcoming
    ? upcoming.prayer === "dhuhr" && isFridayIso(upcoming.date) ? "الجمعة" : labels[upcoming.prayer].ar
    : null;

  return (
    <section className="tv-empty">
      <span className="hero-kicker">GEBETSZEITEN · مواقيت الصلاة</span>
      <h2 lang="ar" dir="rtl">الصلاة القادمة</h2>
      <p lang="de">Nächstes Gebet</p>
      {upcoming && ar && de ? (
        <>
          <h2 lang="ar" dir="rtl">{ar}</h2>
          <p>{de}</p>
          <output className="state-countdown">{upcoming.time}</output>
        </>
      ) : (
        <p>Gebetszeiten werden aktualisiert · يتم تحديث المواقيت</p>
      )}
    </section>
  );
}

export function DisplayMain({ vm }: { vm: DisplayRuntimeViewModel }) {
  const state = vm.state;
  if (!state) return (
    <section className="tv-empty" data-testid="tv-initial-loading">
      <h2 dir="rtl" lang="ar">جاري تحميل شاشة المسجد</h2>
      <p lang="de">Daten werden geladen</p>
    </section>
  );

  switch (state.kind) {
    case "NORMAL":
      return renderNormalSlide(vm, vm.normalSlide) ?? <NextPrayerFallback vm={vm} />;
    case "POST_PRAYER_AZKAR":
      return <AfterPrayerBoard vm={vm} />;
    case "PRAYER_APPROACHING":
      return <PrayerApproaching vm={vm} />;
    case "PRAYER_TIME_NOW":
      return <PrayerTimeNow vm={vm} />;
    case "WAITING_FOR_IQAMA":
      return <WaitingForIqama vm={vm} />;
    case "IQAMA_NOW":
      return <IqamaNow vm={vm} />;
    case "PRAYER_IN_PROGRESS":
      return <PrayerInProgress vm={vm} />;
    case "FRIDAY_MODE":
      return <FridayMode vm={vm} />;
    case "JUMUAH_NOW":
      return <JumuahNow vm={vm} />;
    default: {
      const exhaustive: never = state.kind;
      return exhaustive;
    }
  }
}
