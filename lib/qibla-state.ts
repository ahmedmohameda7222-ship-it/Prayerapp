import { calculateSignedTurnDelta, isQiblaAligned } from "@/lib/qibla-utils";

export type QiblaMode =
  | "idle"
  | "locating"
  | "bearing-ready"
  | "requesting-compass"
  | "bearing-only"
  | "live"
  | "aligned"
  | "location-error";

export type LiveCompassBlockReason =
  | "permission-denied"
  | "unsupported"
  | "sensor-timeout"
  | "relative-heading"
  | "invalid-heading"
  | "calibration-required"
  | "magnetic-correction-unavailable"
  | "landscape"
  | "tilted";

export type LocationSource = "gps" | "manual";

export interface QiblaState {
  mode: QiblaMode;
  bearing: number | null;
  trueHeading: number | null;
  turnDelta: number | null;
  liveBlockReason: LiveCompassBlockReason | null;
  locationSource: LocationSource | null;
}

export type QiblaEvent =
  | { type: "LOCATE" }
  | { type: "LOCATION_READY"; bearing: number; source: LocationSource }
  | { type: "LOCATION_ERROR" }
  | { type: "REQUEST_COMPASS" }
  | { type: "COMPASS_BLOCKED"; reason: LiveCompassBlockReason }
  | { type: "TRUSTED_HEADING"; heading: number }
  | { type: "RESET" };

export const initialQiblaState: QiblaState = {
  mode: "idle",
  bearing: null,
  trueHeading: null,
  turnDelta: null,
  liveBlockReason: null,
  locationSource: null,
};

function hasBearing(state: QiblaState): state is QiblaState & { bearing: number } {
  return Number.isFinite(state.bearing);
}

export function qiblaReducer(state: QiblaState, event: QiblaEvent): QiblaState {
  switch (event.type) {
    case "RESET":
      return initialQiblaState;

    case "LOCATE":
      return {
        ...initialQiblaState,
        mode: "locating",
      };

    case "LOCATION_READY":
      if (!Number.isFinite(event.bearing)) return state;
      return {
        mode: "bearing-ready",
        bearing: event.bearing,
        trueHeading: null,
        turnDelta: null,
        liveBlockReason: null,
        locationSource: event.source,
      };

    case "LOCATION_ERROR":
      return {
        ...initialQiblaState,
        mode: "location-error",
      };

    case "REQUEST_COMPASS":
      if (!hasBearing(state)) return state;
      return {
        ...state,
        mode: "requesting-compass",
        trueHeading: null,
        turnDelta: null,
        liveBlockReason: null,
      };

    case "COMPASS_BLOCKED":
      if (!hasBearing(state)) return state;
      return {
        ...state,
        mode: "bearing-only",
        trueHeading: null,
        turnDelta: null,
        liveBlockReason: event.reason,
      };

    case "TRUSTED_HEADING": {
      if (!hasBearing(state) || !Number.isFinite(event.heading)) return state;
      const turnDelta = calculateSignedTurnDelta(state.bearing, event.heading);
      const wasAligned = state.mode === "aligned";
      const aligned = isQiblaAligned(turnDelta, wasAligned);
      return {
        ...state,
        mode: aligned ? "aligned" : "live",
        trueHeading: event.heading,
        turnDelta,
        liveBlockReason: null,
      };
    }

    default:
      return state;
  }
}
