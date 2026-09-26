type DisplayContentKind = "announcement" | "event" | "campaign";

type PublishableDisplayContent = {
  published?: boolean;
  isActive?: boolean;
  titleAr?: string;
  titleDe?: string;
  messageAr?: string;
  messageDe?: string;
  descriptionAr?: string;
  descriptionDe?: string;
  locationAr?: string;
  locationDe?: string;
  donationUrl?: string | null;
};

// Admin publication uses the same JSON string representation as the Feed
// builder, rather than raw string-byte counts, so quotes/backslashes/control
// characters cannot pass here and later exceed the public-row ceiling after
// JSON escaping. The 10 KiB limit leaves headroom below the 16 KiB RPC row cap.
const MAX_DISPLAY_ADMIN_PROJECTED_UTF8_BYTES = 10 * 1024;
const DISPLAY_SIZING_ID = "00000000-0000-0000-0000-000000000000";
const DISPLAY_SIZING_TIMESTAMP = "9999-12-31T23:59:59.999Z";

function displayProjectionForSizing(
  kind: DisplayContentKind,
  item: PublishableDisplayContent,
): unknown {
  if (kind === "announcement") {
    return {
      id: DISPLAY_SIZING_ID,
      titleAr: item.titleAr ?? "",
      titleDe: item.titleDe ?? "",
      messageAr: item.messageAr ?? "",
      messageDe: item.messageDe ?? "",
      isUrgent: true,
      displayStyle: "special",
      displayFrom: DISPLAY_SIZING_TIMESTAMP,
      displayUntil: DISPLAY_SIZING_TIMESTAMP,
    };
  }

  if (kind === "event") {
    return {
      id: DISPLAY_SIZING_ID,
      titleAr: item.titleAr ?? "",
      titleDe: item.titleDe ?? "",
      descriptionAr: item.descriptionAr ?? "",
      descriptionDe: item.descriptionDe ?? "",
      locationAr: item.locationAr ?? "",
      locationDe: item.locationDe ?? "",
      date: "9999-12-31",
      startTime: "23:59",
      endTime: "23:59",
      type: "x".repeat(64),
    };
  }

  return {
    id: DISPLAY_SIZING_ID,
    titleAr: item.titleAr ?? "",
    titleDe: item.titleDe ?? "",
    descriptionAr: item.descriptionAr ?? "",
    descriptionDe: item.descriptionDe ?? "",
    targetAmount: 100_000_000,
    collectedAmount: 100_000_000,
    startDate: "9999-12-31",
    endDate: "9999-12-31",
    donationUrl: item.donationUrl ?? null,
    isFeatured: true,
  };
}

function exceedsDisplayProjectionBudget(
  kind: DisplayContentKind,
  item: PublishableDisplayContent,
): boolean {
  const serialized = JSON.stringify(displayProjectionForSizing(kind, item));
  return new TextEncoder().encode(serialized).byteLength > MAX_DISPLAY_ADMIN_PROJECTED_UTF8_BYTES;
}

function missing(value: string | undefined): boolean {
  return !value?.trim();
}

function requireFields(
  item: PublishableDisplayContent,
  fields: Array<[keyof PublishableDisplayContent, string]>,
  suffix: string,
): string[] {
  return fields
    .filter(([key]) => missing(item[key] as string | undefined))
    .map(([, label]) => `${label} is required for ${suffix}`);
}

export function validateDisplayPublishableContent(
  kind: DisplayContentKind,
  item: PublishableDisplayContent,
): string[] {
  if (kind === "announcement") {
    if (!item.published) return [];
    return requireFields(item, [
      ["titleAr", "Arabic title"],
      ["messageAr", "Arabic message"],
      ["titleDe", "German title"],
      ["messageDe", "German message"],
    ], "published display content");
  }

  if (kind === "event") {
    if (!item.published) return [];
    return requireFields(item, [
      ["titleAr", "Arabic title"],
      ["descriptionAr", "Arabic description"],
      ["locationAr", "Arabic location"],
      ["titleDe", "German title"],
      ["descriptionDe", "German description"],
      ["locationDe", "German location"],
    ], "published display content");
  }

  if (!item.isActive) return [];
  const errors = requireFields(item, [
    ["titleAr", "Arabic title"],
    ["descriptionAr", "Arabic description"],
    ["titleDe", "German title"],
    ["descriptionDe", "German description"],
  ], "active display campaign");
  if (item.donationUrl) {
    try {
      const url = new URL(item.donationUrl);
      if (url.protocol !== "https:" || url.username || url.password || !url.hostname) {
        errors.push("Donation URL must use HTTPS");
      }
    } catch {
      errors.push("Donation URL must use HTTPS");
    }
  }
  return errors;
}

export function validateDisplayAdminPublishableContent(
  kind: DisplayContentKind,
  item: PublishableDisplayContent,
): string[] {
  const errors = validateDisplayPublishableContent(kind, item);
  const isDisplayActive =
    kind === "campaign" ? item.isActive === true : item.published === true;

  if (!isDisplayActive) return errors;

  if (exceedsDisplayProjectionBudget(kind, item)) {
    errors.push(
      kind === "campaign"
        ? "Active display campaign exceeds maximum display size"
        : "Published display content exceeds maximum display size",
    );
  }

  return errors;
}
