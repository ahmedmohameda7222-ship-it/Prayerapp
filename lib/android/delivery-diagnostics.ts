export type FallbackActivationDiagnostic = Readonly<{
  signal: "fallback_activation";
  kind: "reminder" | "adhan";
  count: number;
  receiptLookupFailed: boolean;
}>;

export function fallbackActivationDiagnostic(input: {
  kind: "reminder" | "adhan";
  count: number;
  receiptLookupFailed: boolean;
}): FallbackActivationDiagnostic {
  return {
    signal: "fallback_activation",
    kind: input.kind,
    count: Math.max(0, Math.trunc(input.count)),
    receiptLookupFailed: input.receiptLookupFailed,
  };
}

export function logFallbackActivation(input: {
  kind: "reminder" | "adhan";
  count: number;
  receiptLookupFailed: boolean;
}) {
  console.warn("[android-delivery-telemetry]", fallbackActivationDiagnostic(input));
}
