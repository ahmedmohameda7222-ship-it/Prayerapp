import type { DisplayRuntimeViewModel } from "../../lib/runtime/use-display-runtime";
import { getUpcomingPrayer } from "../../lib/upcoming-prayer";

export function NextPrayerSlide({ vm }: { vm: DisplayRuntimeViewModel }) {
  const next = vm.feed ? getUpcomingPrayer(vm.feed, vm.logicalNow) : null;

  return (
    <section className="next-prayer-slide" data-testid="next-prayer-slide">
      <span className="hero-kicker">GEBETSZEITEN · مواقيت الصلاة</span>
      <div className="next-prayer-heading">
        <h2 dir="rtl" lang="ar">الصلاة القادمة</h2>
        <p lang="de">Nächstes Gebet</p>
      </div>

      {next ? (
        <>
          <div className="next-prayer-names">
            <h3 dir="rtl" lang="ar">{next.labelAr}</h3>
            <p lang="de">{next.labelDe}</p>
          </div>
          <div className="next-prayer-times">
            <div className="next-prayer-time">
              <span>{next.serviceNumber !== null ? "Beginn / الموعد" : "Adhan / الأذان"}</span>
              <time data-testid="next-prayer-adhan">{next.adhanTime}</time>
            </div>
            {next.iqamaTime !== null ? (
              <div className="next-prayer-time">
                <span>Iqama / الإقامة</span>
                <time data-testid="next-prayer-iqama">{next.iqamaTime}</time>
              </div>
            ) : null}
          </div>
        </>
      ) : (
        <p className="next-prayer-unavailable">
          Gebetszeiten werden aktualisiert · يتم تحديث المواقيت
        </p>
      )}
    </section>
  );
}
