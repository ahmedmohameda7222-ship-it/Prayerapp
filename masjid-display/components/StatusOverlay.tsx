export interface StatusOverlayProps {
  networkAvailable: boolean;
  usingLkg: boolean;
  prayerScheduleStale: boolean;
}

export function StatusOverlay({
  networkAvailable,
  usingLkg,
  prayerScheduleStale,
}: StatusOverlayProps) {
  if (prayerScheduleStale) {
    return (
      <div className="status-overlay status-overlay-alert" role="alert">
        <strong>UPDATE REQUIRED / يلزم التحديث</strong>
        <span>Prayer schedule coverage is stale / بيانات مواقيت الصلاة تحتاج إلى تحديث</span>
      </div>
    );
  }

  if (!networkAvailable || usingLkg) {
    return (
      <div className="status-overlay" role="status">
        <strong>OFFLINE / غير متصل</strong>
        <span>Using validated cached data / يتم عرض آخر بيانات موثوقة</span>
      </div>
    );
  }

  return null;
}
