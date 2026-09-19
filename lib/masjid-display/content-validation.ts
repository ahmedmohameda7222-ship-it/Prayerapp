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

const MAX_DISPLAY_PUBLISHABLE_VARIABLE_UTF8_BYTES = 10 * 1024;

function variableUtf8Bytes(values: Array<string | null | undefined>): number {
  return new TextEncoder().encode(
    values.filter((value): value is string => typeof value === "string").join("\u0000"),
  ).byteLength;
}

function exceedsDisplayProjectionBudget(
  kind: DisplayContentKind,
  item: PublishableDisplayContent,
): boolean {
  const values =
    kind === "announcement"
      ? [item.titleAr, item.titleDe, item.messageAr, item.messageDe]
      : kind === "event"
        ? [
            item.titleAr,
            item.titleDe,
            item.descriptionAr,
            item.descriptionDe,
            item.locationAr,
            item.locationDe,
          ]
        : [item.titleAr, item.titleDe, item.descriptionAr, item.descriptionDe, item.donationUrl];

  return variableUtf8Bytes(values) > MAX_DISPLAY_PUBLISHABLE_VARIABLE_UTF8_BYTES;
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
    const errors = requireFields(item, [
      ["titleAr", "Arabic title"],
      ["messageAr", "Arabic message"],
      ["titleDe", "German title"],
      ["messageDe", "German message"],
    ], "published display content");
    if (exceedsDisplayProjectionBudget(kind, item)) {
      errors.push("Published display content exceeds maximum display size");
    }
    return errors;
  }

  if (kind === "event") {
    if (!item.published) return [];
    const errors = requireFields(item, [
      ["titleAr", "Arabic title"],
      ["descriptionAr", "Arabic description"],
      ["locationAr", "Arabic location"],
      ["titleDe", "German title"],
      ["descriptionDe", "German description"],
      ["locationDe", "German location"],
    ], "published display content");
    if (exceedsDisplayProjectionBudget(kind, item)) {
      errors.push("Published display content exceeds maximum display size");
    }
    return errors;
  }

  if (!item.isActive) return [];
  const errors = requireFields(item, [
    ["titleAr", "Arabic title"],
    ["descriptionAr", "Arabic description"],
    ["titleDe", "German title"],
    ["descriptionDe", "German description"],
  ], "active display campaign");
  if (exceedsDisplayProjectionBudget(kind, item)) {
    errors.push("Active display campaign exceeds maximum display size");
  }
  return errors;
}
