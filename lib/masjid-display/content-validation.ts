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
};

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
  return requireFields(item, [
    ["titleAr", "Arabic title"],
    ["descriptionAr", "Arabic description"],
    ["titleDe", "German title"],
    ["descriptionDe", "German description"],
  ], "active display campaign");
}
