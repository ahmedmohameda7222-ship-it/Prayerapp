export type UserRole =
  | "Super Admin"
  | "Prayer Admin"
  | "Donation Admin"
  | "Content Admin"
  | "Announcement Admin"
  | "Viewer";

export type PrayerName = "fajr" | "sunrise" | "dhuhr" | "asr" | "maghrib" | "isha";

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
  notes: string;
  published: boolean;
}

export type AnnouncementType = "General" | "Urgent" | "Location update" | "Community" | "Ramadan" | "Eid" | "Donation";

export interface Announcement {
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
  receiptNote: string;
}

export interface DonationCampaign {
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
  repeatCount: number;
  source: string;
  sortOrder: number;
  isPublished: boolean;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  type: string;
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
}

export interface MosqueSettings {
  mosqueName: string;
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
