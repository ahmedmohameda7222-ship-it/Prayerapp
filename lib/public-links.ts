export type PublicExternalLinkKind = "maps" | "whatsapp" | "telegram" | "paypal";

const approvedDomains: Record<PublicExternalLinkKind, readonly string[]> = {
  maps: ["google.com", "maps.app.goo.gl", "goo.gl"],
  whatsapp: ["wa.me", "whatsapp.com"],
  telegram: ["t.me", "telegram.me", "telegram.dog"],
  paypal: ["paypal.com", "paypal.me"],
};

function isApprovedHostname(hostname: string, approved: readonly string[]) {
  return approved.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`));
}

export function safeExternalUrl(
  value: string | null | undefined,
  kind: PublicExternalLinkKind,
): string | undefined {
  if (!value || value !== value.trim()) return undefined;

  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:"
      || url.port
      || url.username
      || url.password
      || !isApprovedHostname(url.hostname.toLowerCase(), approvedDomains[kind])
    ) {
      return undefined;
    }

    return url.href;
  } catch {
    return undefined;
  }
}

export function safeEmailHref(value: string | null | undefined): string | undefined {
  const email = value?.trim();
  if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email)) return undefined;
  return `mailto:${email}`;
}

export function safeTelephoneHref(value: string | null | undefined): string | undefined {
  const telephone = value?.trim();
  if (!telephone || !/^[+()0-9 .-]{3,32}$/u.test(telephone)) return undefined;
  return `tel:${telephone}`;
}
