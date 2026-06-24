import type {
  Announcement,
  AuditLog,
  AzkarCategory,
  AzkarItem,
  Donation,
  DonationCampaign,
  DonationReceiptRequest,
  DonationReport,
  DonationSettings,
  Event,
  JumuahTime,
  MosqueSettings,
  PrayerTime,
  RamadanDay,
  UserRole,
} from "./types";

export const timezone = "Europe/Berlin";

export const mosqueSettings: MosqueSettings = {
  mosqueName: "IQAMA Masjid Deggendorf",
  address: "Musterstrasse 12, 94469 Deggendorf, Germany",
  phone: "+49 991 123456",
  email: "info@deggendorf-prayer.example",
  googleMapsLink: "#",
  whatsappLink: "#",
  telegramLink: "#",
  accountHolder: "Islamische Gemeinde Deggendorf",
  iban: "DE89 3704 0044 0532 0130 00",
  bic: "COBADEFFXXX",
};

export const prayerTimes: PrayerTime[] = [
  ["2026-06-22", "03:18", "05:06", "13:12", "17:31", "21:19", "22:58"],
  ["2026-06-23", "03:18", "05:06", "13:12", "17:31", "21:19", "22:58"],
  ["2026-06-24", "03:19", "05:07", "13:13", "17:32", "21:19", "22:57"],
  ["2026-06-25", "03:20", "05:07", "13:13", "17:32", "21:19", "22:57"],
  ["2026-06-26", "03:21", "05:08", "13:13", "17:33", "21:19", "22:56"],
  ["2026-06-27", "03:22", "05:08", "13:13", "17:33", "21:18", "22:56"],
  ["2026-06-28", "03:23", "05:09", "13:14", "17:33", "21:18", "22:55"],
].map(([date, fajr, sunrise, dhuhr, asr, maghrib, isha], index) => ({
  id: `pt-${index + 1}`,
  date,
  fajr,
  sunrise,
  dhuhr,
  asr,
  maghrib,
  isha,
  fajrIqama: "04:00",
  dhuhrIqama: "13:30",
  asrIqama: "18:00",
  maghribIqama: "21:25",
  ishaIqama: "23:10",
  note: "Times are manually published by mosque administration.",
  published: true,
  updatedAt: "2026-06-20T18:30:00+02:00",
}));

export const jumuahTimes: JumuahTime[] = [
  {
    id: "jum-1",
    date: "2026-06-26",
    khutbahTime: "13:15",
    prayerTime: "13:45",
    locationName: "IQAMA Masjid, Deggendorf",
    locationAddress: "Musterstrasse 12, 94469 Deggendorf",
    khateebName: "Shaykh Abdul Rahman",
    language: "Arabic / German / English",
    notes: "Please arrive early and keep entrances clear for families.",
    published: true,
  },
];

export const announcements: Announcement[] = [
  {
    id: "ann-1",
    title: "Friday location update",
    message: "Jumu'ah will be held at IQAMA Masjid this week. Please arrive before the khutbah begins.",
    type: "Location update",
    isUrgent: true,
    published: true,
    createdAt: "2026-06-24T09:00:00+02:00",
  },
  {
    id: "ann-2",
    title: "Quran class registration",
    message: "Registration is open for the weekly Quran class for adults and youth.",
    type: "Community",
    isUrgent: false,
    published: true,
    createdAt: "2026-06-23T18:30:00+02:00",
  },
  {
    id: "ann-3",
    title: "Support monthly rent",
    message: "The monthly rent campaign is active. Bank transfer details are available on the donations page.",
    type: "Donation",
    isUrgent: false,
    published: true,
    createdAt: "2026-06-22T12:00:00+02:00",
  },
];

export const donationSettings: DonationSettings = {
  accountHolder: mosqueSettings.accountHolder,
  iban: mosqueSettings.iban,
  bic: mosqueSettings.bic,
  paypalLink: "",
  defaultPurpose: "Masjid donation",
  receiptNote: "Receipt requests are reviewed manually by the mosque administration.",
};

export const donationCampaigns: DonationCampaign[] = [
  {
    id: "camp-1",
    title: "Monthly Rent Support",
    description: "Help cover rent, utilities, and core mosque operations.",
    targetAmount: 4000,
    collectedAmount: 2450,
    startDate: "2026-06-01",
    endDate: "2026-06-30",
    isActive: true,
    isFeatured: true,
  },
  {
    id: "camp-2",
    title: "Ramadan Iftar",
    description: "Support community iftar meals and Ramadan gatherings.",
    targetAmount: 5000,
    collectedAmount: 3120,
    startDate: "2026-02-01",
    endDate: "2026-03-20",
    isActive: true,
    isFeatured: false,
  },
];

export const donations: Donation[] = [
  { id: "don-1", amount: 50, purpose: "Monthly Rent Support", donorName: "Community member", receivedAt: "2026-06-22", method: "Bank transfer" },
  { id: "don-2", amount: 20, purpose: "Masjid donation", receivedAt: "2026-06-23", method: "Cash" },
];

export const receiptRequests: DonationReceiptRequest[] = [
  { id: "rec-1", donorName: "Fatima K.", amount: 150, email: "fatima@example.com", status: "Pending", createdAt: "2026-06-23" },
  { id: "rec-2", donorName: "Omar A.", amount: 80, email: "omar@example.com", status: "Reviewed", createdAt: "2026-06-21" },
];

export const donationReport: DonationReport = {
  month: "June 2026",
  monthlyNeed: 5200,
  donationsReceived: 3570,
  remaining: 1630,
};

export const azkarCategories: AzkarCategory[] = ["Morning", "Evening", "After Prayer", "Sleep", "Travel", "Friday"];

export const azkarItems: AzkarItem[] = [
  {
    id: "az-1",
    category: "Morning",
    arabicText: "اللهم بك أصبحنا وبك أمسينا وبك نحيا وبك نموت وإليك النشور",
    transliteration: "Allahumma bika asbahna wa bika amsayna wa bika nahya wa bika namut wa ilaykan-nushur.",
    translationEn: "O Allah, by You we enter the morning and evening, by You we live and die, and to You is the resurrection.",
    translationDe: "O Allah, durch Dich erreichen wir den Morgen und den Abend, durch Dich leben und sterben wir.",
    repeatCount: 1,
    source: "Tirmidhi",
    sortOrder: 1,
    isPublished: true,
  },
  {
    id: "az-2",
    category: "After Prayer",
    arabicText: "سُبْحَانَ اللهِ",
    transliteration: "Subhan Allah",
    translationEn: "Glory be to Allah.",
    translationDe: "Gepriesen sei Allah.",
    repeatCount: 33,
    source: "Sahih Muslim",
    sortOrder: 2,
    isPublished: true,
  },
  {
    id: "az-3",
    category: "Evening",
    arabicText: "لا إله إلا الله وحده لا شريك له",
    transliteration: "La ilaha illa Allah wahdahu la sharika lah.",
    translationEn: "There is no god but Allah alone, without partner.",
    translationDe: "Es gibt keinen Gott ausser Allah allein, ohne Partner.",
    repeatCount: 10,
    source: "Bukhari and Muslim",
    sortOrder: 3,
    isPublished: true,
  },
];

export const events: Event[] = [
  { id: "ev-1", title: "Quran class", date: "2026-06-27", startTime: "18:30", endTime: "20:00", location: "IQAMA Masjid", type: "Class", description: "Weekly recitation and tajweed practice for adults." },
  { id: "ev-2", title: "Community gathering", date: "2026-06-28", startTime: "19:00", endTime: "21:00", location: "Community hall", type: "Community", description: "Tea, introductions, and community planning." },
  { id: "ev-3", title: "Youth event", date: "2026-07-03", startTime: "17:00", endTime: "19:00", location: "Mosque classroom", type: "Youth", description: "Discussion and activities for young community members." },
  { id: "ev-4", title: "Sisters event", date: "2026-07-05", startTime: "15:00", endTime: "17:00", location: "Women prayer area", type: "Sisters", description: "Monthly sisters circle and planning session." },
  { id: "ev-5", title: "Iftar event", date: "2026-03-01", startTime: "18:00", endTime: "20:00", location: "IQAMA Masjid", type: "Iftar", description: "Community iftar placeholder for the Ramadan schedule." },
];

export const ramadanDays: RamadanDay[] = [
  { id: "ram-1", date: "2026-02-18", ramadanDay: 1, imsak: "05:08", fajr: "05:18", maghrib: "17:39", iftar: "17:39", taraweeh: "19:30", note: "Ramadan calendar placeholder." },
  { id: "ram-2", date: "2026-02-19", ramadanDay: 2, imsak: "05:06", fajr: "05:16", maghrib: "17:41", iftar: "17:41", taraweeh: "19:30" },
];

export const userRoles: UserRole[] = ["Super Admin", "Prayer Admin", "Donation Admin", "Content Admin", "Announcement Admin", "Viewer"];

export const auditLogs: AuditLog[] = [
  { id: "log-1", actor: "Ahmed", action: "changed Asr time on 2026-07-01 from 17:20 to 17:30", createdAt: "2026-06-24 10:15" },
  { id: "log-2", actor: "Admin", action: "created donation campaign Monthly Rent Support", createdAt: "2026-06-23 18:40" },
  { id: "log-3", actor: "Admin", action: "published Friday location update", createdAt: "2026-06-23 09:12" },
];
