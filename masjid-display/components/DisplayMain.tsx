import type { DisplayRuntimeViewModel } from "../lib/runtime/use-display-runtime";
import type { NormalSlide } from "../lib/scheduler";
import { AnnouncementSlide } from "./content/AnnouncementSlide";
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

function NormalPrayerPanel({ vm }: { vm: DisplayRuntimeViewModel }) {
  const day = vm.content?.prayerDay;
  if (!day) return null;
  return (
    <section className="content-slide normal-prayer-panel">
      <h2>Gebetszeiten / مواقيت الصلاة</h2>
      <p>{day.fajr} · {day.sunrise} · {day.dhuhr} · {day.asr} · {day.maghrib} · {day.isha}</p>
    </section>
  );
}

function renderNormalSlide(vm: DisplayRuntimeViewModel, slide: NormalSlide | null) {
  if (!slide || !vm.content) return null;

  switch (slide.kind) {
    case "PRAYER":
      return <NormalPrayerPanel vm={vm} />;
    case "AZKAR": {
      const item = vm.content.azkar.find((entry) => entry.id === slide.itemId);
      return item ? <AzkarSlide item={item} /> : null;
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

export function DisplayMain({ vm }: { vm: DisplayRuntimeViewModel }) {
  const state = vm.state;
  if (!state) return null;

  switch (state.kind) {
    case "NORMAL":
      return renderNormalSlide(vm, vm.normalSlide);
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
