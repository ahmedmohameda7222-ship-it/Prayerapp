const ARABIC_MOSQUE_NAME = "مَسْجِدُ الدُّونَاوْ";

export function ArabicMosqueWordmark() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 2172 724"
      role="img"
      aria-label="مَسْجِدُ الدُّونَاوْ"
      preserveAspectRatio="xMidYMid meet"
      data-approved-wordmark="2026-08-27-spaced"
      className="mosque-name-logo h-auto w-[clamp(220px,62vw,280px)]"
    >
      <title>{ARABIC_MOSQUE_NAME}</title>
      <use href="#word-danube" />
      <use href="#word-masjid" />
    </svg>
  );
}
