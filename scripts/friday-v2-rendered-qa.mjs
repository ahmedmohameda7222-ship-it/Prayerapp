import fs from "node:fs";
import assert from "node:assert/strict";
import { chromium } from "playwright";

const baseUrl = process.env.FRIDAY_V2_QA_BASE_URL || "http://127.0.0.1:3000";
const phase = process.env.FRIDAY_V2_QA_PHASE || "full";
const outputDir = process.env.FRIDAY_V2_QA_OUTPUT || "artifacts/friday-v2-rendered-qa";
const widths = [320, 375, 390, 430, 768, 1440];
const locales = ["ar", "en", "de", "tr"];
const expectedDirection = { ar: "rtl", en: "ltr", de: "ltr", tr: "ltr" };
const expectedReaderTab = { ar: "العربية", en: "English", de: "Deutsch", tr: "Türkçe" };
const expectedFridayName = { ar: "الجمعة", en: "Jumu'ah", de: "Freitagsgebet", tr: "Cuma" };
const browserLocale = { ar: "ar-EG", en: "en-US", de: "de-DE", tr: "tr-TR" };

fs.mkdirSync(outputDir, { recursive: true });

function screenshotPath(name) {
  return `${outputDir}/${name}.png`;
}

async function open(page, path) {
  const response = await page.goto(`${baseUrl}${path}`, { waitUntil: "networkidle" });
  assert.ok(response && response.ok(), `${path} returned ${response?.status()}`);
  await page.waitForTimeout(250);
}

async function makePage(browser, locale, width) {
  const context = await browser.newContext({
    viewport: { width, height: 1100 },
    locale: browserLocale[locale],
    serviceWorkers: "block",
  });
  await context.addCookies([{ name: "locale", value: locale, url: baseUrl }]);
  const page = await context.newPage();
  await page.emulateMedia({ reducedMotion: "reduce" });
  return { context, page };
}

async function assertNoHorizontalOverflow(page, width, label) {
  const state = await page.evaluate(() => ({
    htmlScrollWidth: document.documentElement.scrollWidth,
    htmlClientWidth: document.documentElement.clientWidth,
    bodyScrollWidth: document.body.scrollWidth,
    bodyClientWidth: document.body.clientWidth,
  }));
  assert.ok(
    state.htmlScrollWidth <= width + 1 && state.bodyScrollWidth <= width + 1,
    `${label} overflow at ${width}px: ${JSON.stringify(state)}`,
  );
  return state;
}

async function assertMinTarget(locator, label) {
  const box = await locator.boundingBox();
  assert.ok(box, `${label} has no rendered box`);
  assert.ok(box.height >= 44, `${label} touch target is ${box.height}px high`);
  return box;
}

async function assertHomeHeader(page, locale, width) {
  const root = await page.evaluate(() => ({
    lang: document.documentElement.lang,
    dir: document.documentElement.dir,
  }));
  assert.equal(root.lang, locale, `home ${locale} ${width}px document lang`);
  assert.equal(root.dir, expectedDirection[locale], `home ${locale} ${width}px document dir`);

  const association = page.locator(".home-app-header-association-name");
  assert.equal((await association.innerText()).trim(), "Deggendorfer Integrations und Bildungsverein e.V");
  assert.equal(await page.getByText("Deggendorf", { exact: true }).count(), 1, `Deggendorf line ${locale} ${width}px`);

  const hijriParts = page.locator('[data-testid="header-hijri-date"] [data-hijri-part]');
  assert.deepEqual(
    await hijriParts.evaluateAll((parts) => parts.map((part) => part.getAttribute("data-hijri-part"))),
    ["day", "month", "year", "era"],
    `Hijri DOM order ${locale} ${width}px`,
  );
  if (locale === "ar") {
    assert.equal((await hijriParts.nth(3).innerText()).trim(), "هـ", `Arabic Hijri era ${width}px`);
    const logo = page.locator('img[src="/branding/masjid-al-danube-ar.svg"]');
    await logo.waitFor({ state: "visible" });
    assert.equal(await logo.getAttribute("alt"), "مَسْجِدُ الدُّونَاوْ");
    const logoState = await logo.evaluate((img) => {
      const box = img.getBoundingClientRect();
      const parent = img.parentElement?.getBoundingClientRect();
      const style = getComputedStyle(img);
      return {
        complete: img.complete,
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
        box: { left: box.left, right: box.right, top: box.top, bottom: box.bottom, width: box.width, height: box.height },
        parent: parent ? { left: parent.left, right: parent.right, top: parent.top, bottom: parent.bottom } : null,
        objectFit: style.objectFit,
      };
    });
    assert.ok(logoState.complete && logoState.naturalWidth > 0 && logoState.naturalHeight > 0, `Arabic logo loaded ${width}px`);
    assert.ok(logoState.box.left >= -1 && logoState.box.right <= width + 1, `Arabic logo viewport clipping ${width}px`);
    assert.ok(logoState.parent, `Arabic logo parent missing ${width}px`);
    assert.ok(logoState.box.top >= logoState.parent.top - 1 && logoState.box.bottom <= logoState.parent.bottom + 1, `Arabic logo vertical clipping ${width}px`);
  } else {
    assert.equal(await page.locator('img[src="/branding/masjid-al-danube-ar.svg"]').count(), 0, `Arabic logo leaked into ${locale}`);
    await page.locator(".home-app-header h1").waitFor({ state: "visible" });
  }
}

async function assertNextPrayerRegression(page, width, locale) {
  const surface = page.getByTestId("home-next-prayer-surface");
  await surface.waitFor({ state: "visible" });
  const media = surface.locator(".home-next-prayer-media");
  const image = media.locator("img");
  const state = await image.evaluate((img) => {
    const imageBox = img.getBoundingClientRect();
    const mediaBox = img.closest(".home-next-prayer-media")?.getBoundingClientRect();
    const style = getComputedStyle(img);
    return {
      objectFit: style.objectFit,
      image: { width: imageBox.width, height: imageBox.height },
      media: mediaBox ? { width: mediaBox.width, height: mediaBox.height } : null,
    };
  });
  assert.equal(state.objectFit, "cover", `Next Prayer object-fit ${locale} ${width}px`);
  assert.ok(state.media, `Next Prayer media missing ${locale} ${width}px`);
  assert.ok(Math.abs(state.image.width - state.media.width) <= 1, `Next Prayer image width fill ${locale} ${width}px`);
  assert.ok(Math.abs(state.image.height - state.media.height) <= 1, `Next Prayer image height fill ${locale} ${width}px`);
}

async function assertBottomNav(page, width, locale) {
  const nav = page.locator(".bottom-nav-shell");
  await nav.waitFor({ state: "visible" });
  const boxes = await nav.locator("a").evaluateAll((links) => links.map((link) => {
    const box = link.getBoundingClientRect();
    return { left: box.left, right: box.right, height: box.height };
  }));
  assert.ok(boxes.length > 0, `bottom nav links ${locale} ${width}px`);
  for (const box of boxes) {
    assert.ok(box.height >= 44, `bottom nav target below 44px ${locale} ${width}px`);
    assert.ok(box.left >= -1 && box.right <= width + 1, `bottom nav escapes viewport ${locale} ${width}px`);
  }
}

async function assertPrimaryOnly(browser) {
  for (const locale of locales) {
    for (const width of [320, 1440]) {
      const { context, page } = await makePage(browser, locale, width);
      await open(page, "/");
      await assertNoHorizontalOverflow(page, width, `primary-only home ${locale}`);
      const homeCard = page.getByTestId("home-jumuah-card");
      await homeCard.waitFor({ state: "visible" });
      const homeText = await homeCard.innerText();
      assert.ok(homeText.includes("12:18"), `primary-only Home uses Dhuhr ${locale} ${width}px`);
      assert.ok(!homeText.includes("13:00"), `primary-only Home must not use Dhuhr Iqama ${locale} ${width}px`);
      assert.ok(!homeText.includes("13:30") && !homeText.includes("14:30"), `primary-only Home has no extras ${locale} ${width}px`);

      await open(page, "/friday");
      await assertNoHorizontalOverflow(page, width, `primary-only Friday ${locale}`);
      const rows = page.locator(".friday-service-row");
      assert.equal(await rows.count(), 1, `primary-only Friday row count ${locale} ${width}px`);
      const primary = page.locator('.friday-service-row[data-primary="true"]');
      assert.equal(await primary.count(), 1);
      const primaryText = await primary.innerText();
      assert.ok(primaryText.includes("12:18"));
      assert.ok(!primaryText.includes("13:00"));
      assert.equal(await page.getByTestId("friday-khutbah-cta").count(), 0, `no CTA without published khutbah ${locale} ${width}px`);
      await page.screenshot({ path: screenshotPath(`primary-only-${locale}-${width}`), fullPage: true });
      await context.close();
    }
  }
}

async function assertFullMatrix(browser) {
  const report = [];
  for (const locale of locales) {
    for (const width of widths) {
      const { context, page } = await makePage(browser, locale, width);

      await open(page, "/");
      await assertNoHorizontalOverflow(page, width, `home ${locale}`);
      await assertHomeHeader(page, locale, width);
      await assertNextPrayerRegression(page, width, locale);
      await assertBottomNav(page, width, locale);
      const homeCard = page.getByTestId("home-jumuah-card");
      await homeCard.waitFor({ state: "visible" });
      const homeText = await homeCard.innerText();
      for (const time of ["12:18", "13:30", "14:30"]) {
        assert.ok(homeText.includes(time), `Home ${locale} ${width}px missing ${time}`);
      }
      assert.ok(!homeText.includes("13:00"), `Home ${locale} ${width}px must not expose Dhuhr Iqama as Primary`);
      await page.screenshot({ path: screenshotPath(`home-${locale}-${width}`), fullPage: true });

      await open(page, "/friday");
      const fridayDimensions = await assertNoHorizontalOverflow(page, width, `Friday ${locale}`);
      const fridayPage = page.getByTestId("friday-page");
      await fridayPage.waitFor({ state: "visible" });
      const rows = page.locator(".friday-service-row");
      assert.equal(await rows.count(), 3, `Friday ${locale} ${width}px Primary + two extras`);
      const primary = page.locator('.friday-service-row[data-primary="true"]');
      assert.equal(await primary.count(), 1, `Friday ${locale} ${width}px Primary count`);
      const primaryText = await primary.innerText();
      assert.ok(primaryText.includes("12:18"), `Friday ${locale} ${width}px Primary Dhuhr`);
      assert.ok(!primaryText.includes("13:00"), `Friday ${locale} ${width}px not Dhuhr Iqama`);
      const cta = page.getByTestId("friday-khutbah-cta");
      assert.equal(await cta.count(), 1, `one Friday-level CTA ${locale} ${width}px`);
      const ctaBox = await assertMinTarget(cta, `Friday CTA ${locale} ${width}px`);
      assert.ok(ctaBox.x >= -1 && ctaBox.x + ctaBox.width <= width + 1, `Friday CTA viewport ${locale} ${width}px`);
      assert.ok((await cta.getAttribute("href"))?.endsWith("/friday/khutbah/2026-08-28"));
      assert.ok((await fridayPage.innerText()).includes(expectedFridayName[locale]), `Friday localized name ${locale} ${width}px`);
      await page.screenshot({ path: screenshotPath(`friday-${locale}-${width}`), fullPage: true });

      await open(page, "/friday/khutbah/2026-08-28");
      const readerDimensions = await assertNoHorizontalOverflow(page, width, `reader ${locale}`);
      const reader = page.getByTestId("friday-khutbah-reader");
      await reader.waitFor({ state: "visible" });
      assert.equal(await page.locator("main").count(), 1, `reader main landmark ${locale} ${width}px`);
      assert.equal(await page.locator("main h1").count(), 1, `reader route h1 ${locale} ${width}px`);
      assert.equal(await page.locator("main h2").count(), 1, `reader khutbah h2 ${locale} ${width}px`);
      assert.equal(await page.locator("main h3").count(), 1, `reader chooser h3 ${locale} ${width}px`);
      const tabs = page.locator('[role="tab"]');
      assert.equal(await tabs.count(), 4, `reader language count ${locale} ${width}px`);
      const selectedTab = page.locator('[role="tab"][aria-selected="true"]');
      assert.equal((await selectedTab.innerText()).trim(), expectedReaderTab[locale], `reader default language ${locale} ${width}px`);
      for (let index = 0; index < 4; index += 1) {
        const box = await assertMinTarget(tabs.nth(index), `reader tab ${index} ${locale} ${width}px`);
        assert.ok(box.x >= -1 && box.x + box.width <= width + 1, `reader tab viewport ${index} ${locale} ${width}px`);
      }
      const article = page.getByTestId("friday-khutbah-content");
      await article.waitFor({ state: "visible" });
      const articleState = await article.evaluate((element) => {
        const style = getComputedStyle(element);
        const box = element.getBoundingClientRect();
        return {
          dir: element.getAttribute("dir"),
          lang: element.getAttribute("lang"),
          userSelect: style.userSelect,
          whiteSpace: style.whiteSpace,
          overflowWrap: style.overflowWrap,
          boxWidth: box.width,
          scrollWidth: element.scrollWidth,
          clientWidth: element.clientWidth,
        };
      });
      assert.equal(articleState.dir, expectedDirection[locale], `reader content direction ${locale} ${width}px`);
      assert.equal(articleState.lang, locale, `reader content language ${locale} ${width}px`);
      assert.equal(articleState.userSelect, "text", `reader selectable text ${locale} ${width}px`);
      assert.equal(articleState.whiteSpace, "pre-wrap", `reader line breaks ${locale} ${width}px`);
      assert.ok(articleState.scrollWidth <= articleState.clientWidth + 1, `reader long token overflow ${locale} ${width}px`);
      assert.ok(width < 768 || articleState.boxWidth <= 760, `reader desktop line length ${locale} ${width}px`);
      tabs.nth((locales.indexOf(locale) + 1) % 4).focus();
      assert.equal(await tabs.nth((locales.indexOf(locale) + 1) % 4).evaluate((el) => document.activeElement === el), true, `reader keyboard focus ${locale} ${width}px`);
      await page.screenshot({ path: screenshotPath(`reader-${locale}-${width}`), fullPage: true });

      report.push({ locale, width, fridayDimensions, readerDimensions, articleState });
      await context.close();
    }
  }
  fs.writeFileSync(`${outputDir}/matrix-report.json`, JSON.stringify(report, null, 2));
}

async function assertChooserCase(browser, { date, locale, labels, selectedLabel, chooseLabel, expectedDir, expectedLang, name }) {
  const { context, page } = await makePage(browser, locale, 390);
  await open(page, `/friday/khutbah/${date}`);
  await assertNoHorizontalOverflow(page, 390, `chooser ${name}`);
  const tabs = page.locator('[role="tab"]');
  assert.deepEqual((await tabs.allInnerTexts()).map((value) => value.trim()), labels, `${name} offered languages`);
  const selected = page.locator('[role="tab"][aria-selected="true"]');
  if (selectedLabel) {
    assert.equal(await selected.count(), 1, `${name} selected count`);
    assert.equal((await selected.innerText()).trim(), selectedLabel, `${name} default selection`);
  } else {
    assert.equal(await selected.count(), 0, `${name} must not silently fall back`);
    assert.equal(await page.getByTestId("friday-khutbah-content").count(), 0, `${name} no article before choice`);
  }
  if (chooseLabel) {
    await page.getByRole("tab", { name: chooseLabel, exact: true }).click();
  }
  const article = page.getByTestId("friday-khutbah-content");
  await article.waitFor({ state: "visible" });
  assert.equal(await article.getAttribute("dir"), expectedDir, `${name} chosen direction`);
  assert.equal(await article.getAttribute("lang"), expectedLang, `${name} chosen language`);
  await page.screenshot({ path: screenshotPath(`chooser-${name}`), fullPage: true });
  await context.close();
}

async function assertChooserCases(browser) {
  await assertChooserCase(browser, {
    date: "2026-09-04",
    locale: "de",
    labels: ["العربية", "Türkçe"],
    selectedLabel: null,
    chooseLabel: "Türkçe",
    expectedDir: "ltr",
    expectedLang: "tr",
    name: "ar-tr-app-de",
  });
  await assertChooserCase(browser, {
    date: "2026-09-11",
    locale: "tr",
    labels: ["Türkçe"],
    selectedLabel: "Türkçe",
    chooseLabel: null,
    expectedDir: "ltr",
    expectedLang: "tr",
    name: "tr-only-app-tr",
  });
  await assertChooserCase(browser, {
    date: "2026-09-18",
    locale: "ar",
    labels: ["English", "Deutsch"],
    selectedLabel: null,
    chooseLabel: "Deutsch",
    expectedDir: "ltr",
    expectedLang: "de",
    name: "en-de-app-ar",
  });
}

const browser = await chromium.launch({ headless: true });
try {
  if (phase === "primary-only") {
    await assertPrimaryOnly(browser);
    console.log("Friday V2 rendered QA primary-only/no-CTA phase passed.");
  } else if (phase === "full") {
    await assertFullMatrix(browser);
    await assertChooserCases(browser);
    console.log("Friday V2 rendered QA passed 24 width/locale combinations plus chooser edge cases.");
  } else {
    throw new Error(`Unknown FRIDAY_V2_QA_PHASE: ${phase}`);
  }
} finally {
  await browser.close();
}
