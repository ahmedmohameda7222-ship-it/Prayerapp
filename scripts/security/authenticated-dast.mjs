const baseUrl = (process.env.BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || "";

if (!supabaseUrl || !anonKey || !serviceKey) {
  throw new Error("Authenticated DAST requires local Supabase URL, anon/publishable key, and service-role/secret key");
}

const password = "Prayerapp-Security-DAST-2026!";
const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const users = [
  { email: `security-dast-a-${suffix}@local.invalid`, id: "", token: "" },
  { email: `security-dast-b-${suffix}@local.invalid`, id: "", token: "" },
];

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

async function jsonFetch(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  return { response, body };
}

async function createUser(user) {
  const { response, body } = await jsonFetch(`${supabaseUrl}/auth/v1/admin/users`, {
    method: "POST",
    headers: {
      apikey: serviceKey,
      authorization: `Bearer ${serviceKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ email: user.email, password, email_confirm: true }),
  });
  expect(response.status === 200, `local auth admin user creation failed: ${response.status}`);
  user.id = body?.id || "";
  expect(/^[0-9a-f-]{36}$/i.test(user.id), "local auth admin user creation returned no UUID");

  const signIn = await jsonFetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: anonKey, "content-type": "application/json" },
    body: JSON.stringify({ email: user.email, password }),
  });
  expect(signIn.response.status === 200, `local auth password sign-in failed: ${signIn.response.status}`);
  user.token = signIn.body?.access_token || "";
  expect(user.token.length > 100, "local auth sign-in returned no access token");
}

async function deleteUserAdmin(user) {
  if (!user.id) return;
  await fetch(`${supabaseUrl}/auth/v1/admin/users/${user.id}`, {
    method: "DELETE",
    headers: { apikey: serviceKey, authorization: `Bearer ${serviceKey}` },
  }).catch(() => {});
}

async function appRequest(path, { method = "GET", token = "", origin = baseUrl, body } = {}) {
  const headers = {};
  if (token) headers.authorization = `Bearer ${token}`;
  if (origin) headers.origin = origin;
  if (body !== undefined) headers["content-type"] = "application/json";
  return jsonFetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    redirect: "manual",
  });
}

try {
  await createUser(users[0]);
  await createUser(users[1]);

  const health = await appRequest("/api/health", { origin: "" });
  expect(health.response.status === 200, `exact-head runtime health failed: ${health.response.status}`);

  const adminDenied = await appRequest("/api/admin/launch-readiness", { token: users[0].token });
  expect(adminDenied.response.status === 401, `non-admin authenticated user reached admin API: ${adminDenied.response.status}`);

  const browserA = "00000000-0000-4000-8000-00000000da01";
  const browserB = "00000000-0000-4000-8000-00000000db02";
  const endpoint = `https://fcm.googleapis.com/fcm/send/security-dast-${suffix}`;
  const subscription = (browserId) => ({
    subscription: { endpoint, keys: { p256dh: "security-dast-p256dh", auth: "security-dast-auth" } },
    browserId,
    locale: "en",
    platform: "security-dast",
  });

  const ownerSave = await appRequest("/api/push/subscriptions", {
    method: "POST", token: users[0].token, body: subscription(browserA),
  });
  expect(ownerSave.response.status === 200 && ownerSave.body?.accountAssociated === true,
    `authenticated subscription ownership save failed: ${ownerSave.response.status}`);

  const bolaDenied = await appRequest("/api/push/subscriptions", {
    method: "POST", token: users[1].token, body: subscription(browserB),
  });
  expect(bolaDenied.response.status === 403,
    `cross-account endpoint ownership/BOLA was not denied: ${bolaDenied.response.status}`);

  const crossOriginDelete = await appRequest("/api/account/delete", {
    method: "DELETE", token: users[0].token, origin: "https://attacker.invalid",
  });
  expect(crossOriginDelete.response.status === 403,
    `authenticated cross-origin account deletion was not denied: ${crossOriginDelete.response.status}`);

  const invalidSession = await appRequest("/api/account/delete", {
    method: "DELETE", token: "not-a-valid-session-token",
  });
  expect(invalidSession.response.status === 401,
    `invalid authenticated session was not denied: ${invalidSession.response.status}`);

  let sawRateLimit = false;
  for (let index = 0; index < 35; index += 1) {
    const result = await appRequest("/api/push/subscriptions", {
      method: "POST",
      body: { subscription: { endpoint: "https://invalid.invalid/" }, browserId: browserA, locale: "en" },
    });
    if (result.response.status === 429) {
      sawRateLimit = true;
      expect(Number(result.response.headers.get("retry-after")) >= 1, "rate-limit response omitted Retry-After");
      break;
    }
    expect(result.response.status === 400, `unexpected pre-rate-limit status: ${result.response.status}`);
  }
  expect(sawRateLimit, "durable push abuse boundary did not produce 429 within expected request window");

  const ownDelete = await appRequest("/api/account/delete", {
    method: "DELETE", token: users[0].token,
  });
  expect(ownDelete.response.status === 200 && ownDelete.body?.success === true,
    `authenticated own-account deletion failed: ${ownDelete.response.status}`);

  const deletedSessionDenied = await appRequest("/api/admin/launch-readiness", { token: users[0].token });
  expect(deletedSessionDenied.response.status === 401,
    `deleted-account token remained accepted by protected API: ${deletedSessionDenied.response.status}`);

  const logout = await fetch(`${supabaseUrl}/auth/v1/logout`, {
    method: "POST",
    headers: { apikey: anonKey, authorization: `Bearer ${users[1].token}` },
  });
  expect(logout.status === 204 || logout.status === 200, `local Auth logout failed: ${logout.status}`);

  const loggedOutDenied = await appRequest("/api/admin/launch-readiness", { token: users[1].token });
  expect(loggedOutDenied.response.status === 401,
    `logged-out token remained accepted by protected API: ${loggedOutDenied.response.status}`);

  console.log("PASS: authenticated local DAST verified Auth, admin denial, BOLA/ownership, origin, session revocation, account deletion, and rate limiting");
} finally {
  await Promise.all(users.map(deleteUserAdmin));
}
