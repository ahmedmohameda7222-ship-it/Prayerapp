import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAllowedAdminIdentity: vi.fn(),
  getRuntimePrayerTimezone: vi.fn(),
  from: vi.fn(),
  queries: [] as Array<{
    table: string;
    columns?: string;
    options?: { count?: string; head?: boolean };
    filters: Array<["eq" | "gte" | "lte", string, unknown]>;
    limit?: number;
  }>,
}));

vi.mock("@/lib/auth/admin-server", () => ({
  requireAllowedAdminIdentity: mocks.requireAllowedAdminIdentity,
}));

vi.mock("@/lib/data/prayer-settings", () => ({
  getRuntimePrayerTimezone: mocks.getRuntimePrayerTimezone,
}));

function queryResult(query: (typeof mocks.queries)[number]) {
  if (query.table === "prayer_times") {
    return {
      data: [
        { date: "2026-10-06", published: true },
        { date: "2026-10-07", published: true },
        { date: "2026-10-08", published: true },
        { date: "2026-10-09", published: true },
        { date: "2026-10-10", published: true },
        { date: "2026-10-11", published: true },
        { date: "2026-10-12", published: true },
      ],
      error: null,
      count: null,
    };
  }

  if (query.table === "jumuah_times") {
    return { data: { id: "jumuah-1" }, error: null, count: null };
  }

  const eq = Object.fromEntries(
    query.filters
      .filter(([operator]) => operator === "eq")
      .map(([, field, value]) => [field, value]),
  );

  if (query.table === "donation_campaigns") {
    if (eq.is_active === true) return { data: null, error: null, count: 2 };
    if (eq.is_featured === true) return { data: null, error: null, count: 1 };
  }

  if (query.table === "announcements") {
    if (eq.published === true) return { data: null, error: null, count: 3 };
    if (eq.is_urgent === true) return { data: null, error: null, count: 1 };
  }

  throw new Error(`Unexpected dashboard query: ${JSON.stringify(query)}`);
}

function createQuery(table: string) {
  const query = {
    table,
    filters: [],
  } as (typeof mocks.queries)[number];
  mocks.queries.push(query);

  const chain: Record<string, unknown> = {};
  chain.select = vi.fn((columns: string, options?: { count?: string; head?: boolean }) => {
    query.columns = columns;
    query.options = options;
    return chain;
  });
  chain.eq = vi.fn((field: string, value: unknown) => {
    query.filters.push(["eq", field, value]);
    return chain;
  });
  chain.gte = vi.fn((field: string, value: unknown) => {
    query.filters.push(["gte", field, value]);
    return chain;
  });
  chain.lte = vi.fn((field: string, value: unknown) => {
    query.filters.push(["lte", field, value]);
    return chain;
  });
  chain.limit = vi.fn((value: number) => {
    query.limit = value;
    return chain;
  });
  chain.maybeSingle = vi.fn(async () => queryResult(query));
  chain.then = (resolve: (value: unknown) => unknown, reject: (error: unknown) => unknown) =>
    Promise.resolve(queryResult(query)).then(resolve, reject);
  return chain;
}

vi.mock("@/lib/supabase/server", () => ({
  createServerClient: () => ({
    from: mocks.from,
  }),
}));

import { loadAdminDashboardSummaryAction } from "./dashboard-summary";

describe("admin dashboard summary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.queries.length = 0;
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-06T12:00:00.000Z"));
    mocks.requireAllowedAdminIdentity.mockResolvedValue({
      userId: "admin-1",
      email: "admin@example.com",
      displayName: "Admin",
    });
    mocks.getRuntimePrayerTimezone.mockResolvedValue("Europe/Berlin");
    mocks.from.mockImplementation((table: string) => createQuery(table));
  });

  it("loads one small bounded summary after one authorization", async () => {
    const result = await loadAdminDashboardSummaryAction("stable-admin-token");

    expect(result).toEqual({
      success: true,
      data: {
        today: "2026-10-06",
        timezone: "Europe/Berlin",
        todayPrayerPublished: true,
        nextWeekMissing: true,
        upcomingJumuahPublished: true,
        activeCampaignCount: 2,
        featuredCampaignCount: 1,
        publishedAnnouncementCount: 3,
        urgentAnnouncementCount: 1,
      },
    });

    expect(mocks.requireAllowedAdminIdentity).toHaveBeenCalledTimes(1);
    expect(mocks.requireAllowedAdminIdentity).toHaveBeenCalledWith("stable-admin-token");
    expect(mocks.getRuntimePrayerTimezone).toHaveBeenCalledTimes(1);

    expect(mocks.queries).toHaveLength(6);
    expect(mocks.queries.every((query) => query.columns !== "*")).toBe(true);

    const prayerQuery = mocks.queries.find((query) => query.table === "prayer_times");
    expect(prayerQuery).toMatchObject({ columns: "date,published" });
    expect(prayerQuery?.filters).toContainEqual(["gte", "date", "2026-10-06"]);
    expect(prayerQuery?.filters).toContainEqual(["lte", "date", "2026-10-13"]);

    const jumuahQuery = mocks.queries.find((query) => query.table === "jumuah_times");
    expect(jumuahQuery).toMatchObject({ columns: "id", limit: 1 });
    expect(jumuahQuery?.filters).toContainEqual(["gte", "date", "2026-10-06"]);
    expect(jumuahQuery?.filters).toContainEqual(["eq", "published", true]);

    for (const table of ["donation_campaigns", "announcements"]) {
      const countQueries = mocks.queries.filter((query) => query.table === table);
      expect(countQueries).toHaveLength(2);
      expect(countQueries.every((query) => query.options?.head === true)).toBe(true);
      expect(countQueries.every((query) => query.options?.count === "exact")).toBe(true);
    }
  });
});
