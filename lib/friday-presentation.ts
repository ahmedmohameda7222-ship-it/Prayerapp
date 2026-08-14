import { getLocalizedField } from "@/lib/i18n/localized-content";
import type { Locale } from "@/lib/i18n/types";
import type { JumuahTime } from "@/lib/types";

export type FridayPresentationItem = {
  item: JumuahTime;
  language: string;
  note: string;
  locationName: string;
  locationAddress: string;
  hasLocation: boolean;
  showOwnLocation: boolean;
  showOwnNote: boolean;
};

export type FridayPresentation = {
  items: FridayPresentationItem[];
  sharedLocation?: {
    name: string;
    address: string;
  };
  sharedNote: string;
};

function clean(value: string | undefined) {
  return value?.trim() || "";
}

function locationKey(name: string, address: string) {
  return `${name}\u0000${address}`;
}

export function getFridayPresentation(items: JumuahTime[], locale: Locale): FridayPresentation {
  const localized = items.map((item) => {
    const locationName = clean(item.locationName);
    const locationAddress = clean(item.locationAddress);

    return {
      item,
      language: getLocalizedField(item, "language", locale),
      note: getLocalizedField(item, "notes", locale),
      locationName,
      locationAddress,
      hasLocation: Boolean(locationName || locationAddress),
    };
  });

  const firstLocation = localized[0];
  const canShareLocation = Boolean(firstLocation?.hasLocation)
    && localized.length > 0
    && localized.every(({ locationName, locationAddress, hasLocation }) =>
      hasLocation
      && locationKey(locationName, locationAddress) === locationKey(firstLocation.locationName, firstLocation.locationAddress)
    );

  const notes = localized.map(({ note }) => note);
  const sharedNote = notes.length > 0
    && Boolean(notes[0])
    && notes.every((note) => note === notes[0])
    ? notes[0]
    : "";

  return {
    items: localized.map((entry) => ({
      ...entry,
      showOwnLocation: !canShareLocation && entry.hasLocation,
      showOwnNote: Boolean(entry.note) && entry.note !== sharedNote,
    })),
    sharedLocation: canShareLocation
      ? { name: firstLocation.locationName, address: firstLocation.locationAddress }
      : undefined,
    sharedNote,
  };
}
