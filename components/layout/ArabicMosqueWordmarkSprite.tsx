import { readFileSync } from "node:fs";
import { join } from "node:path";

const APPROVED_WORDMARK_PATH = join(
  process.cwd(),
  "public/branding/masjid-al-danube-ar.svg",
);

const APPROVED_WORDMARK_GROUPS = readFileSync(APPROVED_WORDMARK_PATH, "utf8")
  .replace(/^<svg\b[^>]*>\s*/i, "")
  .replace(/<title\b[^>]*>[\s\S]*?<\/title>\s*/i, "")
  .replace(/<desc\b[^>]*>[\s\S]*?<\/desc>\s*/i, "")
  .replace(/\s*<\/svg>\s*$/i, "");

export function ArabicMosqueWordmarkSprite() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width="0"
      height="0"
      style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}
      dangerouslySetInnerHTML={{ __html: APPROVED_WORDMARK_GROUPS }}
    />
  );
}
