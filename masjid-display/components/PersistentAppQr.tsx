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
      <span lang="de">Prayerapp öffnen</span>
      <span lang="ar" dir="rtl">افتح التطبيق</span>
    </aside>
  );
}
