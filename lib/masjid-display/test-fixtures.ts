import type { MasjidDisplayTestPayload, MasjidDisplayTestScenario } from "@/lib/types";

function addMinutes(iso: string, minutes: number) {
  const value = new Date(iso);
  if (Number.isNaN(value.getTime())) throw new Error("Invalid test scenario start time");
  return new Date(value.getTime() + minutes * 60 * 1000).toISOString();
}

function copy<S extends MasjidDisplayTestScenario>(scenario: S, messageAr: string, messageDe: string) {
  return {
    scenario,
    id: `test-${scenario}`,
    titleAr: "اختبار شاشة المسجد",
    titleDe: "Moschee-Display-Test",
    messageAr,
    messageDe,
  };
}

export function buildTestFixture(
  scenario: MasjidDisplayTestScenario,
  startedAt: string,
): MasjidDisplayTestPayload {
  switch (scenario) {
    case "normal":
      return { ...copy(scenario, "الوضع الطبيعي", "Normalbetrieb") };
    case "prayer_approaching":
      return { ...copy(scenario, "اقتربت الصلاة", "Gebet beginnt bald"), prayer: "isha", targetAt: addMinutes(startedAt, 10) };
    case "prayer_time_now":
      return { ...copy(scenario, "حان وقت الصلاة", "Gebetszeit ist jetzt"), prayer: "isha" };
    case "waiting_for_iqama":
      return { ...copy(scenario, "انتظار الإقامة", "Warten auf Iqama"), prayer: "isha", targetAt: addMinutes(startedAt, 5) };
    case "iqama_now":
      return { ...copy(scenario, "الإقامة الآن", "Iqama ist jetzt"), prayer: "isha" };
    case "prayer_in_progress":
      return { ...copy(scenario, "الصلاة قائمة", "Gebet läuft"), prayer: "isha" };
    case "friday_first_countdown":
      return { ...copy(scenario, "الجمعة الأولى", "Erstes Freitagsgebet"), prayer: "dhuhr", targetAt: addMinutes(startedAt, 60) };
    case "friday_next_countdown":
      return { ...copy(scenario, "الجمعة التالية", "Nächstes Freitagsgebet"), prayer: "dhuhr", targetAt: addMinutes(startedAt, 10) };
    case "jumuah_now":
      return { ...copy(scenario, "صلاة الجمعة الآن", "Freitagsgebet ist jetzt"), prayer: "dhuhr" };
    case "urgent":
      return { ...copy(scenario, "تنبيه عاجل تجريبي", "Test-Dringlichkeitsmeldung") };
    case "special_display":
      return { ...copy(scenario, "إعلان خاص تجريبي", "Test-Sonderanzeige") };
    case "event":
      return {
        scenario,
        id: `test-${scenario}`,
        titleAr: "فعالية تجريبية",
        titleDe: "Testveranstaltung",
        descriptionAr: "وصف فعالية اصطناعي للاختبار فقط",
        descriptionDe: "Synthetische Veranstaltungsbeschreibung nur für Tests",
        locationAr: "قاعة الاختبار",
        locationDe: "Testraum",
        startsAt: addMinutes(startedAt, 30),
      };
    case "campaign":
      return {
        scenario,
        id: `test-${scenario}`,
        titleAr: "حملة تبرع تجريبية",
        titleDe: "Test-Spendenkampagne",
        descriptionAr: "محتوى اصطناعي للاختبار فقط",
        descriptionDe: "Synthetischer Inhalt nur für Tests",
        donationUrl: "https://example.invalid/test-donation",
      };
    case "campaign_without_qr":
      return {
        scenario,
        id: `test-${scenario}`,
        titleAr: "حملة تبرع تجريبية بلا رمز",
        titleDe: "Test-Spendenkampagne ohne QR",
        descriptionAr: "محتوى اصطناعي للاختبار فقط",
        descriptionDe: "Synthetischer Inhalt nur für Tests",
      };
    case "azkar":
      return {
        scenario,
        id: `test-${scenario}`,
        azkarId: "test-azkar-item",
        arabicText: "سُبْحَانَ اللَّهِ",
        germanText: "Gepriesen sei Allah",
      };
    case "offline":
      return { ...copy(scenario, "وضع عدم الاتصال التجريبي", "Test-Offlinemodus") };
    case "stale_prayer_data":
      return { ...copy(scenario, "بيانات الصلاة قديمة تجريبياً", "Test: veraltete Gebetsdaten") };
    case "missing_settings":
      return { ...copy(scenario, "إعدادات مفقودة تجريبياً", "Test: fehlende Einstellungen") };
    case "long_bilingual":
      return {
        ...copy(
          scenario,
          "هذا نص عربي تجريبي طويل لاختبار التفاف الأسطر والتوازن البصري على شاشة المسجد دون استخدام أي محتوى إنتاجي حقيقي.",
          "Dies ist ein langer deutscher Testtext für Zeilenumbruch und visuelle Balance auf dem Moschee-Display ohne echte Produktionsinhalte.",
        ),
      };
  }
}
