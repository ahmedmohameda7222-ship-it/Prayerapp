import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  MAX_ACCOUNT_PUSH_SUBSCRIPTIONS,
  limitAccountAssociatedSubscriptions,
} from "@/lib/security/push-account-limit";

const source = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

type Candidate = {
  id: string;
  user_id: string | null;
};

describe("account push fanout security", () => {
  it("caps each account independently while preserving guest subscriptions", () => {
    const accountA = Array.from({ length: 13 }, (_, index) => ({
      id: `account-a-${index}`,
      user_id: "account-a",
    }));
    const accountB = Array.from({ length: 12 }, (_, index) => ({
      id: `account-b-${index}`,
      user_id: "account-b",
    }));
    const guests = Array.from({ length: 4 }, (_, index) => ({
      id: `guest-${index}`,
      user_id: null,
    }));

    const limited = limitAccountAssociatedSubscriptions<Candidate>([
      ...accountA,
      ...guests,
      ...accountB,
    ]);

    expect(MAX_ACCOUNT_PUSH_SUBSCRIPTIONS).toBe(10);
    expect(limited.filter((item) => item.user_id === "account-a")).toHaveLength(10);
    expect(limited.filter((item) => item.user_id === "account-b")).toHaveLength(10);
    expect(limited.filter((item) => item.user_id === null)).toEqual(guests);
    expect(limited.filter((item) => item.user_id === "account-a").map((item) => item.id))
      .toEqual(accountA.slice(0, 10).map((item) => item.id));
  });

  it("enforces the account ceiling atomically at registration and again before delivery", () => {
    const subscriptionsRoute = source("app/api/push/subscriptions/route.ts");
    const cronRoute = source("app/api/cron/prayer-reminders/route.ts");
    const webPush = source("lib/push/web-push.ts");

    expect(subscriptionsRoute).toContain("MAX_ACCOUNT_PUSH_SUBSCRIPTIONS");
    expect(subscriptionsRoute).toContain('"register_push_subscription"');
    expect(subscriptionsRoute).not.toContain('count: "exact"');
    expect(subscriptionsRoute).toContain("Account push subscription limit reached");
    expect(cronRoute).toContain("limitAccountAssociatedSubscriptions");
    expect(webPush).toContain("limitAccountAssociatedSubscriptions");
  });
});
