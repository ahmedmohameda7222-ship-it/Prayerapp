import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/security/rate-limit", () => ({
  consumeSecurityRateLimit: vi.fn(async () => ({ allowed: true, retryAfterSeconds: 0 })),
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerClient: () => {
    throw new Error("invalid JSON shape reached downstream storage");
  },
}));

import { POST as ENROLL } from "@/app/api/android/native-authority/enroll/route";
import { POST as HEARTBEAT } from "@/app/api/android/native-authority/heartbeat/route";
import { POST as RECEIPT } from "@/app/api/android/native-authority/receipt/route";
import { DELETE as DELETE_SUBSCRIPTION, POST as POST_SUBSCRIPTION } from "@/app/api/push/subscriptions/route";
import { POST as TEST_PUSH } from "@/app/api/push/test/route";

const origin = "https://donaumoschee.vercel.app";
const installationId = "62a9084e-710a-4aa5-b918-d9f398fb6f67";
const authorityId = "8e5f7ac6-7a84-4d3e-946a-e4f91be50a7c";
const credential = "a".repeat(43);

type RouteCase = {
  name: string;
  method: "POST" | "DELETE";
  path: string;
  handler: (request: Request) => Promise<Response>;
  headers?: Record<string, string>;
};

const routes: RouteCase[] = [
  {
    name: "native enrollment",
    method: "POST",
    path: "/api/android/native-authority/enroll",
    handler: ENROLL,
    headers: { Origin: origin },
  },
  {
    name: "native heartbeat",
    method: "POST",
    path: "/api/android/native-authority/heartbeat",
    handler: HEARTBEAT,
    headers: {
      Authorization: `Native ${credential}`,
      "X-Native-Installation-Id": installationId,
      "X-Native-Authority-Id": authorityId,
    },
  },
  {
    name: "native receipt",
    method: "POST",
    path: "/api/android/native-authority/receipt",
    handler: RECEIPT,
    headers: {
      Authorization: `Native ${credential}`,
      "X-Native-Installation-Id": installationId,
      "X-Native-Authority-Id": authorityId,
    },
  },
  {
    name: "push subscription create",
    method: "POST",
    path: "/api/push/subscriptions",
    handler: POST_SUBSCRIPTION,
    headers: { Origin: origin },
  },
  {
    name: "push subscription delete",
    method: "DELETE",
    path: "/api/push/subscriptions",
    handler: DELETE_SUBSCRIPTION,
    headers: { Origin: origin },
  },
  {
    name: "push test",
    method: "POST",
    path: "/api/push/test",
    handler: TEST_PUSH,
    headers: { Origin: origin },
  },
];

function requestFor(route: RouteCase, body: string) {
  return new Request(`${origin}${route.path}`, {
    method: route.method,
    headers: {
      "Content-Type": "application/json",
      ...route.headers,
    },
    body,
  });
}

describe("expected-object JSON route boundaries", () => {
  const wrongShapes: Array<[string, unknown]> = [
    ["null", null],
    ["array", []],
    ["string", "text"],
    ["number", 123],
    ["boolean", true],
  ];

  for (const route of routes) {
    it.each(wrongShapes)(`${route.name} rejects %s JSON as a controlled 400`, async (_label, value) => {
      const response = await route.handler(requestFor(route, JSON.stringify(value)));
      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toEqual({ error: "Invalid JSON object" });
    });

    it(`${route.name} rejects malformed JSON as a controlled 400`, async () => {
      const response = await route.handler(requestFor(route, "{not-json"));
      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toEqual({ error: "Invalid JSON body" });
    });

    it(`${route.name} accepts an object through the shape boundary`, async () => {
      const response = await route.handler(requestFor(route, "{}"));
      expect(response.status).toBe(400);
      const payload = await response.json() as { error?: string };
      expect(payload.error).toBeTruthy();
      expect(payload.error).not.toBe("Invalid JSON object");
      expect(payload.error).not.toBe("Invalid JSON body");
    });
  }
});
