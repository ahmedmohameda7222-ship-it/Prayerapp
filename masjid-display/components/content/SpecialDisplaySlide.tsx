import type { DisplayAnnouncementDto } from "../../lib/feed-types";
import { BilingualBlock } from "./content-view";

export function SpecialDisplaySlide({
  item,
  now,
}: {
  item: DisplayAnnouncementDto;
  now: Date;
}) {
  return (
    <BilingualBlock
      className="content-slide special-display-slide bilingual-slide"
      titleAr={item.titleAr}
      titleDe={item.titleDe}
      bodyAr={item.messageAr}
      bodyDe={item.messageDe}
      now={now}
    />
  );
}
