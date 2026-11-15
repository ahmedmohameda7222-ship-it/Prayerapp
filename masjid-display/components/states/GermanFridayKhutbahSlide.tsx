import type { DisplayRuntimeViewModel } from "../../lib/runtime/use-display-runtime";
import { germanKhutbahPageIndex, paginateGermanKhutbah } from "../../lib/friday-khutbah";
import { localDateIso } from "../../lib/time";
import { fridayTarget } from "./state-view";

export function GermanFridayKhutbahSlide({ vm }: { vm: DisplayRuntimeViewModel }) {
  const date = vm.feed ? localDateIso(vm.logicalNow, vm.feed.timezone) : null;
  const khutbah = vm.fridayKhutbah?.date === date ? vm.fridayKhutbah : null;
  const serviceNumber = (vm.state?.serviceIndex ?? 0) + 1;
  const pages = khutbah ? paginateGermanKhutbah(khutbah.contentDe) : [];
  const serviceStart = fridayTarget(vm)?.getTime() ?? vm.logicalNow.getTime();
  const index = germanKhutbahPageIndex(vm.logicalNow.getTime(), serviceStart, pages.length);

  return (
    <article className="friday-khutbah-slide" data-testid="friday-german-khutbah" lang="de">
      <span className="hero-kicker">FREITAGSPREDIGT · JUMUAH {serviceNumber}</span>
      <h2 className="friday-khutbah-title">
        {khutbah?.titleDe || "Freitagspredigt"}
      </h2>
      {pages.length > 0 ? (
        <>
          <p className="friday-khutbah-body" data-testid="friday-khutbah-body">
            {pages[index]}
          </p>
          <p className="friday-khutbah-pagination" aria-label="Predigtseite">
            Seite {index + 1} / {pages.length}
          </p>
        </>
      ) : (
        <p className="friday-khutbah-unavailable" data-testid="friday-khutbah-unavailable">
          Keine veröffentlichte deutsche Freitagspredigt vorhanden.
        </p>
      )}
    </article>
  );
}
