import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("Friday service card styling", () => {
  it("rounds each Friday prayer service card without changing its semantic row contract", () => {
    const component = source("components/friday/FridayPageClient.tsx");

    expect(component).toContain('className="friday-service-row rounded-[14px] overflow-hidden"');
    expect(component).toContain('data-primary={isPrimary ? "true" : "false"}');
    expect(component).toContain('role="listitem"');
  });
});
