"use client";

import { useEffect, useState } from "react";
import { Compass, LocateFixed, Navigation } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useTranslation } from "@/lib/i18n/use-translation";

const KAABA = { latitude: 21.4225, longitude: 39.8262 };
const DEGGENDORF = { latitude: 48.8409, longitude: 12.9607 };

function qiblaBearing(latitude: number, longitude: number) {
  const toRad = (value: number) => value * Math.PI / 180;
  const toDeg = (value: number) => value * 180 / Math.PI;
  const lat1 = toRad(latitude);
  const lat2 = toRad(KAABA.latitude);
  const deltaLongitude = toRad(KAABA.longitude - longitude);
  const y = Math.sin(deltaLongitude) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLongitude);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

export default function QiblaPage() {
  const { t } = useTranslation();
  const [bearing, setBearing] = useState(() => qiblaBearing(DEGGENDORF.latitude, DEGGENDORF.longitude));
  const [heading, setHeading] = useState(0);
  const [status, setStatus] = useState("qibla.deggendorfEstimate");

  useEffect(() => {
    const update = (event: DeviceOrientationEvent) => {
      const iosHeading = (event as DeviceOrientationEvent & { webkitCompassHeading?: number }).webkitCompassHeading;
      if (typeof iosHeading === "number") setHeading(iosHeading);
      else if (typeof event.alpha === "number") setHeading(360 - event.alpha);
    };
    window.addEventListener("deviceorientationabsolute", update as EventListener);
    window.addEventListener("deviceorientation", update);
    return () => {
      window.removeEventListener("deviceorientationabsolute", update as EventListener);
      window.removeEventListener("deviceorientation", update);
    };
  }, []);

  async function locate() {
    const orientation = DeviceOrientationEvent as typeof DeviceOrientationEvent & { requestPermission?: () => Promise<PermissionState> };
    if (orientation.requestPermission) await orientation.requestPermission().catch(() => "denied");
    if (!navigator.geolocation) return setStatus("qibla.locationUnsupported");
    setStatus("qibla.locating");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setBearing(qiblaBearing(coords.latitude, coords.longitude));
        setStatus("qibla.locationReady");
      },
      () => setStatus("qibla.locationDenied"),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );
  }

  return (
    <AppShell>
      <PageHeader titleKey="qibla.title" />
      <Card className="py-10 text-center">
        <div className="relative mx-auto mb-5 grid h-52 w-52 place-items-center rounded-full border-8 border-[var(--color-emerald-soft)] bg-[var(--color-cream)] shadow-inner">
          <span className="absolute top-2 text-xs font-extrabold text-[var(--color-muted)]">N</span>
          <div className="transition-transform duration-500" style={{ transform: `rotate(${bearing - heading}deg)` }}><Navigation className="h-24 w-24 fill-[var(--color-gold)] text-[var(--color-emerald)]" /></div>
        </div>
        <h2 className="font-brand text-3xl text-[var(--color-emerald)]">{t("qibla.direction", { degrees: Math.round(bearing) })}</h2>
        <p className="mt-3 text-[var(--color-muted)]">{t(status)}</p>
        <p className="mt-2 text-xs text-[var(--color-muted)]">{t("qibla.calibrationHelp")}</p>
        <Button type="button" className="mt-5" onClick={locate}><LocateFixed className="h-5 w-5" />{t("qibla.useMyLocation")}</Button>
        <div className="mt-5 flex items-center justify-center gap-2 text-xs text-[var(--color-muted)]"><Compass className="h-4 w-4" />{t("qibla.sensorNote")}</div>
      </Card>
    </AppShell>
  );
}
