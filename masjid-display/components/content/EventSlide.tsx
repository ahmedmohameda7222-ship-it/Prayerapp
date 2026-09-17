import type { DisplayEventDto } from "../../lib/feed-types";
import { BilingualBlock, selectedPair } from "./content-view";

function textLength(item: DisplayEventDto) {
  return [
    item.titleAr,
    item.titleDe,
    item.descriptionAr,
    item.descriptionDe,
    item.locationAr,
    item.locationDe,
  ].join("").length;
}

export function EventSlide({
  items,
  selectedId,
  now,
}: {
  items: DisplayEventDto[];
  selectedId: string | null;
  now: Date;
}) {
  const visible = selectedPair(items, selectedId, (item) => ({
    textLength: textLength(item),
    hasQr: false,
  }));

  return (
    <section className={`content-card-grid cards-${visible.length}`}>
      {visible.map((item) => (
        <BilingualBlock
          key={item.id}
          className="content-card event-card"
          titleAr={item.titleAr}
          titleDe={item.titleDe}
          bodyAr={
            <>
              <p>{item.descriptionAr}</p>
              <p>{item.locationAr}</p>
              <p>{item.startTime}{item.endTime ? `–${item.endTime}` : ""}</p>
            </>
          }
          bodyDe={
            <>
              <p>{item.descriptionDe}</p>
              <p>{item.locationDe}</p>
              <p>{item.startTime}{item.endTime ? `–${item.endTime}` : ""}</p>
            </>
          }
          now={now}
        />
      )).map((element, index) => (
        <div data-testid="event-card" key={visible[index].id}>{element}</div>
      ))}
    </section>
  );
}
