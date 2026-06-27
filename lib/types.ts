export type PrayerName = "fajr" | "sunrise" | "dhuhr" | "asr" | "maghrib" | "isha";

export interface LocalizedTitleFields {
  titleAr?: string;
  titleEn?: string;
  titleDe?: string;
  titleTr?: string;
}

export interface LocalizedMessageFields {
  messageAr?: string;
  messageEn?: string;
  messageDe?: string;
  messageTr?: string;
}

export interface LocalizedDescriptionFields {
  descriptionAr?: string;
  descriptionEn?: string;
  descriptionDe?: string;
  descriptionTr?: string;
}

export interface LocalizedLocationFields {
  locationAr?: string;
  locationEn?: string;
  locationDe?: string;
  locationTr?: string;
}

export interface PrayerTime {
  id: string;
  date: string;
  fajr: string;
  sunrise: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
  fajrIqama?: string;
  dhuhrIqama?: string;
  asrIqama?: string;
  maghribIqama?: string;
  ishaIqama?: string;
  note?: string;
  noteAr?: string;
  noteEn?: string;
  noteDe?: string;
  noteTr?: string;
  published: boolean;
  updatedAt: string;
}

export interface JumuahTime {
  id: string;
  date: string;
  khutbahTime: string;
  prayerTime: string;
  locationName: string;
  locationAddress: string;
  khateebName: string;
  language: string;
  languageAr?: string;
  languageEn?: string;
  languageDe?: string;
  languageTr?: string;
  notes: string;
  notesAr?: string;
  notesEn?: string;
  notesDe?: string;
  notesTr?: string;
  published: boolean;
}

export type AnnouncementType = "General" | "Urgent" | "Location update" | "Community" | "Ramadan" | "Eid" | "Donation";

export interface Announcement extends LocalizedTitleFields, LocalizedMessageFields {
  id: string;
  title: string;
  message: string;
  type: AnnouncementType;
  isUrgent: boolean;
  published: boolean;
  createdAt: string;
}

export interface DonationSettings {
  accountHolder: string;
  iban: string;
  bic: string;
  paypalLink?: string;
  defaultPurpose: string;
  defaultPurposeAr?: string;
  defaultPurposeEn?: string;
  defaultPurposeDe?: string;
  defaultPurposeTr?: string;
  receiptNote: string;
  receiptNoteAr?: string;
  receiptNoteEn?: string;
  receiptNoteDe?: string;
  receiptNoteTr?: string;
}

export interface DonationCampaign extends LocalizedTitleFields, LocalizedDescriptionFields {
  id: string;
  title: string;
  description: string;
  targetAmount: number;
  collectedAmount: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
  isFeatured: boolean;
}

export interface Donation {
  id: string;
  amount: number;
  purpose: string;
  donorName?: string;
  receivedAt: string;
  method: "Bank transfer" | "Cash" | "PayPal";
}

export interface DonationReceiptRequest {
  id: string;
  donorName: string;
  amount: number;
  email: string;
  postalAddress?: string;
  donationDate?: string;
  transferReference?: string;
  status: "Pending" | "Reviewed" | "Sent";
  createdAt: string;
}

export interface DonationReport {
  month: string;
  monthlyNeed: number;
  donationsReceived: number;
  remaining: number;
}

export type AzkarCategory = "Morning" | "Evening" | "After Prayer" | "Sleep" | "Travel" | "Friday";

export interface AzkarItem {
  id: string;
  category: AzkarCategory;
  arabicText: string;
  transliteration: string;
  translationEn: string;
  translationDe: string;
  translationAr?: string;
  translationTr?: string;
  repeatCount: number;
  source: string;
  sortOrder: number;
  isPublished: boolean;
}

export interface Event extends LocalizedTitleFields, LocalizedDescriptionFields, LocalizedLocationFields {
  id: string;
  title: string;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  type: string;
  published?: boolean;
}

export interface RamadanDay {
  id: string;
  date: string;
  ramadanDay: number;
  imsak: string;
  fajr: string;
  maghrib: string;
  iftar: string;
  taraweeh: string;
  note?: string;
  noteAr?: string;
  noteEn?: string;
  noteDe?: string;
  noteTr?: string;
  published?: boolean;
}

export interface MosqueSettings {
  mosqueName: string;
  mosqueNameAr?: string;
  mosqueNameEn?: string;
  mosqueNameDe?: string;
  mosqueNameTr?: string;
  address: string;
  phone: string;
  email: string;
  googleMapsLink: string;
  whatsappLink: string;
  telegramLink: string;
  accountHolder: string;
  iban: string;
  bic: string;
}

export interface AuditLog {
  id: string;
  actor: string;
  action: string;
  createdAt: string;
}
