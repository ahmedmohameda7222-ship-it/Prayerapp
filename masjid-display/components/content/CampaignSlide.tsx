import { QRCodeSVG } from "qrcode.react";
import type { DisplayCampaignDto } from "../../lib/feed-types";
import { BilingualBlock, selectedPair } from "./content-view";

function textLength(item: DisplayCampaignDto) {
  return [item.titleAr, item.titleDe, item.descriptionAr, item.descriptionDe].join("").length;
}

export function CampaignSlide({
  items,
  selectedId,
  now,
}: {
  items: DisplayCampaignDto[];
  selectedId: string | null;
  now: Date;
}) {
  const visible = selectedPair(items, selectedId, (item) => ({
    textLength: textLength(item),
    hasQr: Boolean(item.donationUrl),
  }));

  return (
    <section className={`content-card-grid cards-${visible.length}`}>
      {visible.map((item) => (
        <article className="content-card campaign-card" data-testid="campaign-card" key={item.id}>
          <BilingualBlock
            titleAr={item.titleAr}
            titleDe={item.titleDe}
            bodyAr={item.descriptionAr}
            bodyDe={item.descriptionDe}
            now={now}
          />
          <p className="campaign-progress">
            {item.collectedAmount} / {item.targetAmount}
          </p>
          {item.donationUrl ? (
            <QRCodeSVG
              data-testid="campaign-qr"
              value={item.donationUrl}
              level="M"
              marginSize={2}
              size={220}
              title="Spenden / تبرع"
            />
          ) : null}
        </article>
      ))}
    </section>
  );
}
