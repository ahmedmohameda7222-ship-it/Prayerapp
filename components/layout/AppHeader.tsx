"use client";

import Link from "next/link";
import { MapPin, UserRound } from "lucide-react";
import { NotificationButton } from "@/components/notifications/NotificationButton";
import { LanguageMenu } from "@/components/home/LanguageMenu";
import { HomeInstallAction } from "@/components/home/HomeInstallAction";
import { usePublicAuth } from "@/components/providers/AuthProvider";
import { todayIso, formatHijriDate, formatLongDate } from "@/lib/date-utils";
import { useTranslation } from "@/lib/i18n/use-translation";
import { APP_NAMES, ASSOCIATION_NAME } from "@/lib/app-brand";
import { safeExternalUrl } from "@/lib/public-links";

function WhatsAppIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      viewBox="0 0 16 16"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M13.601 2.326A7.85 7.85 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.9 7.9 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.9 7.9 0 0 0 13.6 2.326zM7.994 14.521a6.6 6.6 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.56 6.56 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592m3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.73.73 0 0 0-.529.247c-.182.198-.691.677-.691 1.654s.71 1.916.81 2.049c.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232" />
    </svg>
  );
}

function ArabicMosqueBrandMark() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 1852 584"
      role="img"
      aria-label={APP_NAMES.ar}
      preserveAspectRatio="xMidYMid meet"
      className="mosque-name-logo h-auto w-[clamp(190px,54vw,230px)]"
    >
      <path
        fill="#F2EBDD"
        fillRule="evenodd"
        d="M1365 483 L1352 507 L1352 510 L1379 527 L1384 528 L1397 505 L1397 501 L1369 483 Z M278 321 L266 309 L259 305 L253 303 L242 304 L236 307 L228 315 L224 321 L218 335 L214 352 L215 373 L218 379 L226 387 L237 391 L257 391 L272 388 L282 388 L284 390 L287 400 L287 405 L276 419 L264 430 L243 445 L229 453 L201 466 L184 472 L167 476 L151 477 L150 478 L134 478 L108 474 L88 466 L77 459 L65 447 L57 434 L52 419 L50 393 L51 392 L51 382 L56 358 L64 333 L70 319 L70 317 L67 317 L61 328 L48 363 L42 389 L41 411 L40 412 L41 430 L44 446 L51 464 L57 474 L72 490 L89 501 L101 506 L122 511 L150 511 L179 505 L209 493 L241 475 L263 458 L278 442 L290 422 L297 399 L299 385 L297 361 L291 343 Z M227 347 L235 337 L244 334 L249 335 L262 347 L268 357 L267 358 L242 359 L233 356 L228 351 Z M418 233 L406 256 L406 260 L430 276 L432 276 L438 266 L445 250 L421 233 Z M973 480 L975 492 L982 508 L992 519 L1002 525 L1013 528 L1030 528 L1044 525 L1059 519 L1076 510 L1101 492 L1118 477 L1135 459 L1151 439 L1158 428 L1165 414 L1171 392 L1173 394 L1176 410 L1181 427 L1183 430 L1183 433 L1188 445 L1196 458 L1207 470 L1214 475 L1234 483 L1256 483 L1279 477 L1372 440 L1408 429 L1451 421 L1479 420 L1480 419 L1497 420 L1500 419 L1512 395 L1512 391 L1473 391 L1472 390 L1456 390 L1455 389 L1422 386 L1416 384 L1398 382 L1357 374 L1289 357 L1305 349 L1329 333 L1357 308 L1368 296 L1374 292 L1377 293 L1378 313 L1380 323 L1388 338 L1400 349 L1408 353 L1423 357 L1445 357 L1466 352 L1490 340 L1505 329 L1506 330 L1507 344 L1511 353 L1521 362 L1532 366 L1544 366 L1557 361 L1572 347 L1577 340 L1582 352 L1588 358 L1599 362 L1607 361 L1615 357 L1623 349 L1626 343 L1629 341 L1634 353 L1645 366 L1651 370 L1661 374 L1676 375 L1689 372 L1703 365 L1711 359 L1729 341 L1737 350 L1758 364 L1782 374 L1797 376 L1804 370 L1810 357 L1811 332 L1806 313 L1800 301 L1790 291 L1778 287 L1766 289 L1749 299 L1715 335 L1703 341 L1688 345 L1673 345 L1664 343 L1653 337 L1647 331 L1642 322 L1640 314 L1642 296 L1639 296 L1635 301 L1629 313 L1625 327 L1620 332 L1613 335 L1606 335 L1600 333 L1592 325 L1590 315 L1594 303 L1594 297 L1591 297 L1588 301 L1579 318 L1572 328 L1567 332 L1558 336 L1552 337 L1539 336 L1530 332 L1523 325 L1521 320 L1521 313 L1526 297 L1523 297 L1495 317 L1473 326 L1457 329 L1429 328 L1419 325 L1408 319 L1401 313 L1395 305 L1392 298 L1390 286 L1391 262 L1388 260 L1385 260 L1380 262 L1368 272 L1361 280 L1340 299 L1315 317 L1283 334 L1245 349 L1232 378 L1233 381 L1243 381 L1257 384 L1263 384 L1384 410 L1381 412 L1363 417 L1330 430 L1283 446 L1258 451 L1238 450 L1224 445 L1213 437 L1202 424 L1193 406 L1187 389 L1175 338 L1175 334 L1170 318 L1170 314 L1157 272 L1140 229 L1128 206 L1128 204 L1125 204 L1118 231 L1118 241 L1126 255 L1137 280 L1138 285 L1147 306 L1161 352 L1165 380 L1159 395 L1150 409 L1130 433 L1107 455 L1086 471 L1069 481 L1054 488 L1037 493 L1019 494 L1006 491 L995 484 L991 480 L986 471 L983 458 L984 438 L989 417 L994 401 L1004 377 L1004 375 L1001 375 L992 392 L978 431 L973 460 Z M1750 323 L1752 321 L1762 317 L1771 317 L1775 319 L1780 324 L1785 332 L1789 342 L1786 343 L1777 340 L1758 330 Z M333 90 L323 123 L323 131 L329 144 L332 172 L333 173 L333 181 L335 189 L341 257 L342 258 L342 268 L343 269 L345 307 L347 319 L347 333 L348 334 L349 353 L354 387 L362 410 L367 418 L376 427 L389 433 L406 433 L418 429 L426 424 L433 418 L439 410 L445 396 L449 379 L449 372 L450 371 L449 353 L443 332 L433 313 L430 312 L422 333 L420 345 L430 364 L435 376 L437 385 L427 393 L415 398 L394 399 L385 395 L378 388 L372 378 L367 361 L364 342 L359 264 L358 263 L355 219 L354 218 L354 209 L353 208 L353 199 L352 198 L348 158 L349 157 L365 171 L367 171 L368 162 L361 143 L336 90 Z M780 35 L777 36 L767 69 L766 77 L774 91 L777 116 L783 148 L785 168 L787 174 L787 181 L792 207 L794 227 L797 239 L802 276 L805 288 L821 383 L824 411 L825 412 L825 428 L826 429 L825 436 L813 448 L800 455 L789 458 L777 458 L769 456 L759 450 L751 442 L741 424 L737 413 L730 385 L726 360 L718 328 L718 324 L709 298 L709 295 L696 263 L685 241 L682 241 L675 268 L675 274 L690 306 L702 339 L710 369 L713 393 L708 405 L692 428 L658 462 L638 477 L621 487 L597 496 L575 497 L562 491 L555 483 L551 472 L551 467 L572 444 L583 427 L592 408 L597 393 L600 378 L600 357 L598 345 L592 327 L588 318 L579 304 L571 296 L563 291 L558 289 L545 289 L535 294 L529 300 L521 314 L516 329 L514 341 L514 354 L519 367 L526 374 L531 377 L537 379 L560 379 L572 376 L581 376 L585 379 L589 391 L572 415 L555 432 L554 429 L560 412 L560 407 L558 407 L551 424 L548 437 L529 452 L491 475 L422 509 L363 533 L314 550 L314 553 L343 550 L369 545 L381 544 L396 540 L406 539 L414 536 L423 535 L440 530 L461 522 L496 505 L520 491 L544 473 L545 474 L544 492 L547 506 L552 515 L560 523 L567 527 L579 530 L596 529 L610 525 L630 515 L657 495 L679 474 L693 458 L708 436 L715 421 L719 407 L721 410 L727 438 L733 455 L738 463 L738 465 L745 475 L752 482 L761 488 L770 491 L790 490 L806 483 L822 468 L829 455 L837 426 L839 413 L839 376 L838 375 L838 367 L833 339 L833 333 L827 297 L824 286 L819 251 L817 245 L817 239 L809 190 L807 184 L803 153 L801 147 L797 113 L798 112 L813 125 L818 124 L818 119 L814 107 L807 94 L789 52 Z M528 335 L531 329 L536 324 L540 322 L548 322 L553 324 L564 335 L568 342 L565 344 L559 345 L541 345 L533 342 Z M890 30 L888 32 L878 66 L878 73 L883 82 L887 98 L887 106 L894 149 L899 194 L902 207 L904 229 L909 255 L909 261 L911 268 L911 274 L913 281 L925 365 L927 401 L928 402 L928 428 L927 429 L926 449 L924 456 L924 461 L926 461 L933 444 L940 412 L941 395 L942 394 L942 380 L943 379 L943 362 L942 361 L942 347 L941 346 L939 321 L928 256 L926 237 L924 231 L924 225 L917 188 L907 107 L908 106 L925 121 L928 120 L928 115 L925 105 L892 30 Z"
      />
    </svg>
  );
}

type AppHeaderProps = {
  title?: string;
  whatsappLink?: string;
  googleMapsLink?: string;
};

export function AppHeader({ title, whatsappLink, googleMapsLink }: AppHeaderProps) {
  const { t, locale } = useTranslation();
  const { user } = usePublicAuth();
  const currentDateIso = todayIso();
  const currentDate = formatLongDate(currentDateIso, locale);
  const hijriDate = formatHijriDate(currentDateIso, locale);
  const mosqueName = title || APP_NAMES[locale];
  const useArabicBrandLogo = !title && locale === "ar";
  const whatsappHref = safeExternalUrl(whatsappLink, "whatsapp");
  const mapsHref = safeExternalUrl(googleMapsLink, "maps");

  return (
    <header className="home-app-header border-b border-[var(--home-divider)] bg-[var(--home-surface)]">
      <div className="home-app-header-chrome bg-[var(--home-brand)] px-4 pb-5 pt-2 text-white sm:px-5">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center" dir="ltr">
          <div className="flex items-center justify-self-start gap-0.5">
            <Link
              href={user ? "/account" : "/account/sign-in"}
              aria-label={t("phase1.account")}
              className="grid h-11 w-11 place-items-center rounded-[10px] text-white transition-colors hover:bg-white/10 active:bg-white/10"
            >
              <UserRound className="h-5 w-5" aria-hidden="true" />
            </Link>
            {whatsappHref ? (
              <a
                href={whatsappHref}
                target="_blank"
                rel="noreferrer"
                aria-label={t("mosque.whatsapp")}
                className="grid h-11 w-11 place-items-center rounded-[10px] text-white transition-colors hover:bg-white/10 active:bg-white/10"
              >
                <WhatsAppIcon className="h-5 w-5" />
              </a>
            ) : null}
            {mapsHref ? (
              <a
                href={mapsHref}
                target="_blank"
                rel="noreferrer"
                aria-label={t("mosque.googleMaps")}
                className="grid h-11 w-11 place-items-center rounded-[10px] text-white transition-colors hover:bg-white/10 active:bg-white/10"
              >
                <MapPin className="h-5 w-5" aria-hidden="true" />
              </a>
            ) : null}
          </div>
          <span aria-hidden="true" />
          <div className="flex shrink-0 items-center justify-self-end gap-1">
            <HomeInstallAction />
            <LanguageMenu />
            <NotificationButton home />
          </div>
        </div>

        <div className="mt-1 text-center">
          {useArabicBrandLogo ? (
            <h1 lang="ar" className="flex justify-center">
              <ArabicMosqueBrandMark />
            </h1>
          ) : (
            <h1 lang={locale} className="text-[28px] font-bold leading-tight text-[#F2EBDD]">
              {mosqueName}
            </h1>
          )}
          <p className="home-app-header-association-name mx-auto mt-2 max-w-[min(88vw,520px)] text-[14px] font-medium leading-snug text-[rgba(255,255,255,0.88)] sm:text-[15px]">
            {ASSOCIATION_NAME}
          </p>
          <p className="mt-1 text-[13px] font-semibold text-[rgba(255,255,255,0.72)]">Deggendorf</p>
        </div>

        <div className="mt-4 grid grid-cols-2 items-center gap-4 text-[13px] font-semibold text-[rgba(255,255,255,0.82)]" dir="ltr">
          <span className="text-left" data-testid="header-hijri-date">{hijriDate}</span>
          <time className="text-right" dateTime={currentDateIso} data-testid="header-gregorian-date">{currentDate}</time>
        </div>
      </div>

      <div className="px-4 py-5 text-center sm:px-5">
        <p dir="rtl" lang="ar" className="home-quran-text text-[20px] font-semibold leading-[1.85] text-[var(--home-brand-strong)]">
          إِنَّ الصَّلَاةَ كَانَتْ عَلَى الْمُؤْمِنِينَ كِتَابًا مَّوْقُوتًا
        </p>
        <p dir="rtl" lang="ar" className="mt-1 text-xs font-semibold text-[var(--home-text-secondary)]">النساء: 103</p>
      </div>
    </header>
  );
}
