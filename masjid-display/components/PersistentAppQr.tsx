import { QRCodeSVG } from "qrcode.react";

export function PersistentAppQr({ publicAppUrl }: { publicAppUrl: string | null }) {
  if (!publicAppUrl) return null;

  return (
    <aside className="persistent-app-qr" aria-label="Prayerapp">
      <div className="qr-frame">
        <QRCodeSVG
          data-testid="prayerapp-qr"
          value={publicAppUrl}
          level="M"
          marginSize={4}
          size={256}
          title="Prayerapp öffnen / افتح التطبيق"
        />
      </div>
      <span className="qr-caption">
        App öffnen <span lang="ar" dir="rtl">افتح التطبيق</span>
      </span>
    </aside>
  );
}
