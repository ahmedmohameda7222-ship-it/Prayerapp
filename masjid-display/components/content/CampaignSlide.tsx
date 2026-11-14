import { QRCodeSVG } from "qrcode.react";
import type { DisplayCampaignDto } from "../../lib/feed-types";
import { BilingualBlock } from "./content-view";

const money = (value: number) =>
  new Intl.NumberFormat("de-DE", { maximumFractionDigits: 2 }).format(value);

export function CampaignSlide({
  items, selectedId, now,
}: {
  items: DisplayCampaignDto[];
  selectedId: string | null;
  now: Date;
}) {
  const item = items.find((entry) => entry.id === selectedId) ?? items[0];
  if (!item) return null;

  const percent = item.targetAmount > 0
    ? Math.min(100, Math.max(0, (item.collectedAmount / item.targetAmount) * 100))
    : 0;

  return (
    <article
      className={`campaign-layout${item.donationUrl ? "" : " no-donation-url"}`}
      data-testid="campaign-card"
    >
      <div className="campaign-text">
        <span className="hero-kicker">SPENDENAKTION · حملة تبرع</span>
        <BilingualBlock
          className="campaign-bilingual"
          titleAr={item.titleAr}
          titleDe={item.titleDe}
          bodyAr={item.descriptionAr}
          bodyDe={item.descriptionDe}
          now={now}
        />
        <div
          className="campaign-progress-track"
          role="progressbar"
          aria-label="Spendenfortschritt"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(percent)}
        >
          <span style={{ width: `${percent}%` }} />
        </div>
        <p className="campaign-progress">
          {money(item.collectedAmount)} / {money(item.targetAmount)}
        </p>
        <p className="campaign-percent">{money(percent)} % erreicht · تم جمع {money(percent)}٪</p>
      </div>
      {item.donationUrl ? (
        <aside className="campaign-donation-qr">
          <QRCodeSVG
            data-testid="campaign-qr"
            value={item.donationUrl}
            level="M"
            marginSize={4}
            size={260}
            title="Spenden / تبرع"
          />
          <h3>Spenden / تبرع</h3>
          <p>Spenden-QR · رمز التبرع</p>
        </aside>
      ) : null}
    </article>
  );
}
