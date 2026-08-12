import type { Locale } from "@/lib/i18n/types";

export const phase1Copy: Record<Locale, {
  account: string;
  privacy: string;
  signIn: string;
  createAccount: string;
  signOut: string;
  deleteAccount: string;
  deleteConfirm: string;
  email: string;
  password: string;
  newPassword: string;
  forgotPassword: string;
  resetPassword: string;
  sendReset: string;
  checkEmail: string;
  accountRequired: string;
  savedAzkar: string;
  reminderOn: string;
  reminderOff: string;
  reminderSaveError: string;
  reminderSignIn: string;
  reminderDescription: string;
  accountSubtitle: string;
  signedInAs: string;
  noAccountNeeded: string;
  authError: string;
  donationReflection: string;
  donationReflectionVerse: string;
  privacyTitle: string;
  privacyIntro: string;
  privacyEmail: string;
  privacySaved: string;
  privacyReminders: string;
  privacyPush: string;
  privacyPurpose: string;
  privacyGuest: string;
  privacyDelete: string;
  privacyDisable: string;
  copied: string;
  manageReminders: string;
}> = {
  ar: {
    account: "الحساب",
    privacy: "الخصوصية",
    signIn: "تسجيل الدخول",
    createAccount: "إنشاء حساب",
    signOut: "تسجيل الخروج",
    deleteAccount: "حذف الحساب",
    deleteConfirm: "سيتم حذف حسابك والأذكار المحفوظة وتفضيلات تذكير الصلاة نهائيًا. هل تريد المتابعة؟",
    email: "البريد الإلكتروني",
    password: "كلمة المرور",
    newPassword: "كلمة المرور الجديدة",
    forgotPassword: "نسيت كلمة المرور؟",
    resetPassword: "إعادة تعيين كلمة المرور",
    sendReset: "إرسال رابط إعادة التعيين",
    checkEmail: "تحقق من بريدك الإلكتروني لإكمال الخطوة التالية.",
    accountRequired: "يلزم تسجيل الدخول لحفظ هذا الاختيار عبر أجهزتك.",
    savedAzkar: "الأذكار المحفوظة",
    reminderOn: "تذكير مفعّل",
    reminderOff: "تذكير متوقف",
    reminderSaveError: "تعذر حفظ تذكير الصلاة. حاول مرة أخرى.",
    reminderSignIn: "سجّل الدخول لتفعيل تذكير هذه الصلاة.",
    reminderDescription: "تذكيرات الصلاة تعمل عند وقت الأذان الرسمي لكل صلاة تختارها.",
    accountSubtitle: "حساب اختياري لحفظ الأذكار وتذكيرات الصلاة.",
    signedInAs: "مسجل الدخول باسم",
    noAccountNeeded: "يمكن استخدام التطبيق العام بدون حساب.",
    authError: "تعذر إكمال العملية. تحقق من البيانات وحاول مرة أخرى.",
    donationReflection: "الصدقة تمتد إلى ما نحب، وكل مساهمة تساعد المسجد والمجتمع.",
    donationReflectionVerse: "لن تنالوا البر حتى تنفقوا مما تحبون — آل عمران 3:92",
    privacyTitle: "الخصوصية والبيانات",
    privacyIntro: "نجمع فقط البيانات اللازمة للميزات التي تختار استخدامها.",
    privacyEmail: "البريد والحساب: يستخدمان للمصادقة وتأكيد ملكية الحساب واستعادته.",
    privacySaved: "الأذكار المحفوظة: نخزن معرّفات الأذكار التي تحفظها فقط، وليس تقدمك اليومي.",
    privacyReminders: "تذكيرات الصلاة: نخزن الصلوات الخمس التي فعّلت تذكيرها لحسابك.",
    privacyPush: "الإشعارات: قد نخزن نقطة إرسال الإشعار ومفاتيح الجهاز واللغة وبيانات تقنية محدودة لازمة للتسليم.",
    privacyPurpose: "تستخدم هذه البيانات لتشغيل الحساب والمزامنة والتذكيرات والإشعارات فقط.",
    privacyGuest: "المحتوى العام ومواقيت الصلاة متاحة بدون حساب.",
    privacyDelete: "حذف الحساب يحذف الأذكار المحفوظة وتفضيلات التذكير ويزيل ارتباط أجهزة الإشعارات بالحساب.",
    privacyDisable: "تعطيل الإشعارات يوقف إشعارات هذا الجهاز ولا يحذف حسابك.",
    copied: "تم النسخ",
    manageReminders: "اختر تذكيرات كل صلاة من الصفحة الرئيسية.",
  },
  en: {
    account: "Account",
    privacy: "Privacy",
    signIn: "Sign in",
    createAccount: "Create account",
    signOut: "Sign out",
    deleteAccount: "Delete account",
    deleteConfirm: "This permanently deletes your account, Saved Azkar, and prayer reminder preferences. Continue?",
    email: "Email",
    password: "Password",
    newPassword: "New password",
    forgotPassword: "Forgot password?",
    resetPassword: "Reset password",
    sendReset: "Send reset link",
    checkEmail: "Check your email to complete the next step.",
    accountRequired: "Sign in is required to save this choice across devices.",
    savedAzkar: "Saved Azkar",
    reminderOn: "Reminder on",
    reminderOff: "Reminder off",
    reminderSaveError: "Could not save the prayer reminder. Please try again.",
    reminderSignIn: "Sign in to enable a reminder for this prayer.",
    reminderDescription: "Prayer reminders are delivered at the official adhan time for each prayer you select.",
    accountSubtitle: "An optional account for Saved Azkar and prayer reminders.",
    signedInAs: "Signed in as",
    noAccountNeeded: "The public app remains usable without an account.",
    authError: "The request could not be completed. Check your details and try again.",
    donationReflection: "Giving reaches what we value, and every contribution supports the mosque and community.",
    donationReflectionVerse: "You will never attain righteousness until you spend from what you love — Quran 3:92",
    privacyTitle: "Privacy and data",
    privacyIntro: "We collect only the data needed for features you choose to use.",
    privacyEmail: "Email and account: used for authentication, email ownership confirmation, and account recovery.",
    privacySaved: "Saved Azkar: we store only the stable IDs of Azkar you save; daily counting progress stays on your device.",
    privacyReminders: "Prayer reminders: we store which of the five prayers you enabled for your account.",
    privacyPush: "Push notifications: we may store the push endpoint, device keys, language, and limited technical device data needed for delivery.",
    privacyPurpose: "These data are used only to provide accounts, synchronization, reminders, and notifications.",
    privacyGuest: "Public content and prayer times are available without an account.",
    privacyDelete: "Deleting your account removes Saved Azkar and reminder preferences and removes account association from notification devices.",
    privacyDisable: "Disabling notifications stops push on that device; it does not delete your account.",
    copied: "Copied",
    manageReminders: "Choose each prayer reminder from the Home prayer table.",
  },
  de: {
    account: "Konto",
    privacy: "Datenschutz",
    signIn: "Anmelden",
    createAccount: "Konto erstellen",
    signOut: "Abmelden",
    deleteAccount: "Konto löschen",
    deleteConfirm: "Dadurch werden dein Konto, gespeicherte Adhkar und Gebetserinnerungen dauerhaft gelöscht. Fortfahren?",
    email: "E-Mail",
    password: "Passwort",
    newPassword: "Neues Passwort",
    forgotPassword: "Passwort vergessen?",
    resetPassword: "Passwort zurücksetzen",
    sendReset: "Link zum Zurücksetzen senden",
    checkEmail: "Prüfe deine E-Mail, um den nächsten Schritt abzuschließen.",
    accountRequired: "Zum geräteübergreifenden Speichern ist eine Anmeldung erforderlich.",
    savedAzkar: "Gespeicherte Adhkar",
    reminderOn: "Erinnerung an",
    reminderOff: "Erinnerung aus",
    reminderSaveError: "Die Gebetserinnerung konnte nicht gespeichert werden. Bitte erneut versuchen.",
    reminderSignIn: "Melde dich an, um für dieses Gebet eine Erinnerung zu aktivieren.",
    reminderDescription: "Gebetserinnerungen werden zur offiziellen Adhan-Zeit jedes ausgewählten Gebets gesendet.",
    accountSubtitle: "Ein optionales Konto für gespeicherte Adhkar und Gebetserinnerungen.",
    signedInAs: "Angemeldet als",
    noAccountNeeded: "Die öffentliche App kann ohne Konto genutzt werden.",
    authError: "Die Aktion konnte nicht abgeschlossen werden. Prüfe deine Angaben und versuche es erneut.",
    donationReflection: "Spenden berühren das, was uns wichtig ist, und jede Unterstützung hilft Moschee und Gemeinde.",
    donationReflectionVerse: "Ihr werdet die Güte nicht erreichen, bevor ihr von dem spendet, was ihr liebt — Koran 3:92",
    privacyTitle: "Datenschutz und Daten",
    privacyIntro: "Wir erfassen nur Daten, die für von dir gewählte Funktionen benötigt werden.",
    privacyEmail: "E-Mail und Konto: für Anmeldung, Bestätigung der E-Mail-Inhaberschaft und Kontowiederherstellung.",
    privacySaved: "Gespeicherte Adhkar: gespeichert werden nur stabile IDs; dein täglicher Zählfortschritt bleibt auf dem Gerät.",
    privacyReminders: "Gebetserinnerungen: gespeichert wird, welche der fünf Gebete du für dein Konto aktiviert hast.",
    privacyPush: "Push: gespeichert werden können Push-Endpunkt, Geräteschlüssel, Sprache und begrenzte technische Daten für die Zustellung.",
    privacyPurpose: "Diese Daten dienen nur Konto, Synchronisierung, Erinnerungen und Benachrichtigungen.",
    privacyGuest: "Öffentliche Inhalte und Gebetszeiten sind ohne Konto verfügbar.",
    privacyDelete: "Beim Löschen des Kontos werden gespeicherte Adhkar und Erinnerungen gelöscht und Geräte vom Konto getrennt.",
    privacyDisable: "Das Deaktivieren von Benachrichtigungen stoppt Push auf diesem Gerät, löscht aber nicht dein Konto.",
    copied: "Kopiert",
    manageReminders: "Wähle die Erinnerung je Gebet in der Gebetstabelle auf Home.",
  },
  tr: {
    account: "Hesap",
    privacy: "Gizlilik",
    signIn: "Giriş yap",
    createAccount: "Hesap oluştur",
    signOut: "Çıkış yap",
    deleteAccount: "Hesabı sil",
    deleteConfirm: "Bu işlem hesabınızı, kaydedilen zikirleri ve namaz hatırlatma tercihlerini kalıcı olarak siler. Devam edilsin mi?",
    email: "E-posta",
    password: "Şifre",
    newPassword: "Yeni şifre",
    forgotPassword: "Şifrenizi mi unuttunuz?",
    resetPassword: "Şifreyi sıfırla",
    sendReset: "Sıfırlama bağlantısı gönder",
    checkEmail: "Sonraki adımı tamamlamak için e-postanızı kontrol edin.",
    accountRequired: "Bu seçimi cihazlar arasında kaydetmek için giriş yapmalısınız.",
    savedAzkar: "Kaydedilen Zikirler",
    reminderOn: "Hatırlatma açık",
    reminderOff: "Hatırlatma kapalı",
    reminderSaveError: "Namaz hatırlatması kaydedilemedi. Lütfen tekrar deneyin.",
    reminderSignIn: "Bu namaz için hatırlatma açmak üzere giriş yapın.",
    reminderDescription: "Namaz hatırlatmaları seçtiğiniz her namazın resmi ezan vaktinde gönderilir.",
    accountSubtitle: "Kaydedilen zikirler ve namaz hatırlatmaları için isteğe bağlı hesap.",
    signedInAs: "Giriş yapılan hesap",
    noAccountNeeded: "Herkese açık uygulama hesap olmadan kullanılabilir.",
    authError: "İşlem tamamlanamadı. Bilgilerinizi kontrol edip tekrar deneyin.",
    donationReflection: "İnfak sevdiğimiz şeylere uzanır; her katkı camiyi ve topluluğu destekler.",
    donationReflectionVerse: "Sevdiğiniz şeylerden infak etmedikçe iyiliğe erişemezsiniz — Kur'an 3:92",
    privacyTitle: "Gizlilik ve veriler",
    privacyIntro: "Yalnızca kullanmayı seçtiğiniz özellikler için gereken verileri toplarız.",
    privacyEmail: "E-posta ve hesap: kimlik doğrulama, e-posta sahipliğini doğrulama ve hesap kurtarma için kullanılır.",
    privacySaved: "Kaydedilen zikirler: yalnızca kaydettiğiniz zikirlerin sabit kimliklerini saklarız; günlük sayım ilerlemesi cihazınızda kalır.",
    privacyReminders: "Namaz hatırlatmaları: hesabınızda beş namazdan hangilerini etkinleştirdiğinizi saklarız.",
    privacyPush: "Push bildirimleri: gönderim için gerekli push adresi, cihaz anahtarları, dil ve sınırlı teknik cihaz verileri saklanabilir.",
    privacyPurpose: "Bu veriler yalnızca hesap, senkronizasyon, hatırlatma ve bildirim sağlamak için kullanılır.",
    privacyGuest: "Herkese açık içerik ve namaz vakitleri hesap olmadan kullanılabilir.",
    privacyDelete: "Hesabı silmek kaydedilen zikirleri ve hatırlatma tercihlerini siler ve bildirim cihazlarının hesap bağlantısını kaldırır.",
    privacyDisable: "Bildirimleri kapatmak o cihazdaki push'u durdurur; hesabınızı silmez.",
    copied: "Kopyalandı",
    manageReminders: "Her namaz hatırlatmasını Ana Sayfa namaz tablosundan seçin.",
  },
};
