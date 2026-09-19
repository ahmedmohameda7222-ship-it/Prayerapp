import { QRCodeSVG } from "qrcode.react";

export function PersistentAppQr({ publicAppUrl }: { publicAppUrl: string | null }) {
  if (!publicAppUrl) return null;

  return (
    <aside className="persistent-app-qr" aria-label="Prayerapp">
      <QRCodeSVG
        data-testid="prayerapp-qr"
        value={publicAppUrl}
        level="M"
        marginSize={4}
        size={256}
        title="Prayerapp öffnen / افتح التطبيق"
      />
      <span>Prayerapp öffnen / افتح التطبيق</span>
    </aside>
  );
}
