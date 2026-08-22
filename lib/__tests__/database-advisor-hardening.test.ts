import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  join(process.cwd(), "supabase/migrations/20260822201832_database_advisor_hardening.sql"),
  "utf8",
);

describe("database advisor hardening", () => {
  it("adds covering indexes for every reported foreign key", () => {
    expect(sql).toContain("native_prayer_installations (user_id)");
    expect(sql).toContain("push_notification_deliveries (subscription_id)");
    expect(sql).toContain("push_subscriptions (user_id)");
  });

  it("uses init-plan-safe auth checks without changing personal-row semantics", () => {
    expect(sql).toContain('policy "Users read own saved azkar"');
    expect(sql).toContain('policy "Users update own prayer reminders"');
    expect(sql.match(/\(select auth\.uid\(\)\) = user_id/gu)?.length).toBe(8);
    expect(sql).not.toMatch(/(?<!select )auth\.uid\(\) = user_id/u);
  });

  it("keeps server-only delivery and native-authority tables policy-free", () => {
    expect(sql).not.toMatch(/create policy[\s\S]+on public\.native_prayer_installations/iu);
    expect(sql).not.toMatch(/create policy[\s\S]+on public\.push_notification_deliveries/iu);
    expect(sql).not.toMatch(/create policy[\s\S]+on public\.push_subscriptions/iu);
  });
});
