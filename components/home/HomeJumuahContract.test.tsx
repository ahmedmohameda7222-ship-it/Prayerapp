import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("Home Jumuah integration contract", () => {
  it("uses the existing Friday authority instead of a duplicate production data source", () => {
    const page = source("app/page.tsx");
    expect(page).toContain('import { getJumuahTimes } from "@/lib/data/jumuah"');
    expect(page).toContain("getJumuahTimes()");
    expect(page).toContain("jumuahTimes={jumuahTimes}");
    expect(page).not.toContain("getFridayPreviewMockData");
  });

  it("keeps the temporary wider Home visibility window separate from the Supabase data source", () => {
    const page = source("app/page.tsx");
    const home = source("components/home/HomePageClient.tsx");

    expect(page).toContain("allowAnyFutureJumuah");
    expect(home).toContain("allowAnyFutureFriday: allowAnyFutureJumuah");
    expect(home).not.toContain("jumuahPreview");
  });

  it("places Jumuah after urgent announcements and before prayer times", () => {
    const home = source("components/home/HomePageClient.tsx");
    const urgent = home.indexOf('data-home-section="urgent"');
    const jumuah = home.indexOf('data-home-section="jumuah"');
    const prayer = home.indexOf('data-home-section="prayer-times"');

    expect(urgent).toBeGreaterThan(-1);
    expect(jumuah).toBeGreaterThan(urgent);
    expect(prayer).toBeGreaterThan(jumuah);
  });

  it("keeps the whole contextual card linked to the canonical Friday route", () => {
    const card = source("components/home/HomeJumuahCard.tsx");
    expect(card).toContain('href="/friday"');
    expect(card).toContain('data-testid="home-jumuah-card"');
    expect(card).toContain("تُقام صلاة الجمعة في المسجد في عدة مواعيد.");
  });

  it("labels farther upcoming Fridays without claiming they are two days away", () => {
    const card = source("components/home/HomeJumuahCard.tsx");

    expect(card).toContain('upcoming: "Upcoming Jumu\'ah"');
    expect(card).toContain("schedule.daysUntil === 2");
    expect(card).toContain(": copy.upcoming");
  });

  it("uses the approved image as restrained Home atmosphere", () => {
    const css = source("app/home-jumuah.css");
    expect(css).toContain('background-image: url("/assets/home-jumuah-background.webp")');
    expect(css).toContain(".home-jumuah-overlay");
    expect(css).toContain("box-shadow: none");
  });
});
