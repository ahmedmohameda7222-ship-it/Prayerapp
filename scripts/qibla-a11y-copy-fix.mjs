import fs from "node:fs";

const localeUpdates = {
  en: {
    turnRightAccessible: "Turn right {degrees} degrees to face Qibla",
    turnLeftAccessible: "Turn left {degrees} degrees to face Qibla",
    locationPermissionRequired: "Your precise location is used on this device to calculate Qibla. A coarse location may be used to display your city. Compass readings stay on your device.",
  },
  ar: {
    turnRightAccessible: "انعطف يمينًا {degrees} درجة لتواجه القبلة",
    turnLeftAccessible: "انعطف يسارًا {degrees} درجة لتواجه القبلة",
    locationPermissionRequired: "يُستخدم موقعك الدقيق على هذا الجهاز لحساب اتجاه القبلة. قد يُستخدم موقع تقريبي لعرض مدينتك. تبقى قراءات البوصلة على جهازك.",
  },
  de: {
    turnRightAccessible: "Drehe dich {degrees} Grad nach rechts, um dich zur Qibla auszurichten",
    turnLeftAccessible: "Drehe dich {degrees} Grad nach links, um dich zur Qibla auszurichten",
    locationPermissionRequired: "Dein genauer Standort wird auf diesem Gerät zur Berechnung der Qibla verwendet. Ein grober Standort kann verwendet werden, um deine Stadt anzuzeigen. Kompassmesswerte bleiben auf deinem Gerät.",
  },
  tr: {
    turnRightAccessible: "Kıbleye yönelmek için {degrees} derece sağa dön",
    turnLeftAccessible: "Kıbleye yönelmek için {degrees} derece sola dön",
    locationPermissionRequired: "Kesin konumunuz Kıble yönünü hesaplamak için bu cihazda kullanılır. Şehrinizi göstermek için yaklaşık bir konum kullanılabilir. Pusula okumaları cihazınızda kalır.",
  },
};

for (const [locale, updates] of Object.entries(localeUpdates)) {
  const path = `messages/${locale}.json`;
  const json = JSON.parse(fs.readFileSync(path, "utf8"));
  if (!json.qibla) throw new Error(`Missing qibla namespace in ${path}`);
  json.qibla.locationPermissionRequired = updates.locationPermissionRequired;
  json.qibla.turnRightAccessible = updates.turnRightAccessible;
  json.qibla.turnLeftAccessible = updates.turnLeftAccessible;
  fs.writeFileSync(path, `${JSON.stringify(json, null, 2)}\n`);
}

const componentPath = "components/qibla/QiblaExperience.tsx";
let component = fs.readFileSync(componentPath, "utf8");
const oldHeading = `  return (\n    <h2 className="text-2xl font-black text-[var(--ui-brand-strong)]">\n      {delta > 0 ? t("qibla.turnRight", { degrees }) : t("qibla.turnLeft", { degrees })}\n    </h2>\n  );`;
const newHeading = `  const accessibleGuidance = delta > 0\n    ? t("qibla.turnRightAccessible", { degrees })\n    : t("qibla.turnLeftAccessible", { degrees });\n\n  return (\n    <h2\n      className="text-2xl font-black text-[var(--ui-brand-strong)]"\n      aria-label={accessibleGuidance}\n    >\n      {delta > 0 ? t("qibla.turnRight", { degrees }) : t("qibla.turnLeft", { degrees })}\n    </h2>\n  );`;
if (!component.includes(oldHeading)) throw new Error("Expected PrimaryGuidance heading not found");
component = component.replace(oldHeading, newHeading);
fs.writeFileSync(componentPath, component);
