
-- Insert preview data into Supabase for donations, announcements, and events
-- Using ON CONFLICT DO NOTHING so it can be safely re-run

-- ============================================
-- 1. DONATION SETTINGS (single row)
-- ============================================
INSERT INTO public.donation_settings (
  id, account_holder, iban, bic, paypal_link,
  default_purpose, default_purpose_ar, default_purpose_en, default_purpose_de, default_purpose_tr
) VALUES (
  '1',
  'Islamische Gemeinde Deggendorf e.V.',
  'DE89 3704 0044 0532 0130 00',
  'COBADEFFXXX',
  'https://paypal.me/masjiddeggenmock',
  'تبرع لمسجد ديغندورف',
  'تبرع لمسجد ديغندورف',
  'Donation for Masjid Deggendorf',
  'Spende für die Moschee Deggendorf',
  'Deggendorf Mescidi bağışı'
) ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 2. DONATION CAMPAIGNS
-- ============================================
INSERT INTO public.donation_campaigns (
  id, title, title_ar, title_en, title_de, title_tr,
  description, description_ar, description_en, description_de, description_tr,
  target_amount, collected_amount, start_date, end_date, is_active, is_featured
) VALUES (
  gen_random_uuid(),
  'مشروع توسعة المسجد',
  'مشروع توسعة المسجد',
  'Masjid expansion project',
  'Moschee-Erweiterungsprojekt',
  'Mescit genişletme projesi',
  'المساعدة في تجهيز مساحة إضافية لصلاة الجمعة والفعاليات.',
  'المساعدة في تجهيز مساحة إضافية لصلاة الجمعة والفعاليات.',
  'Help prepare an additional space for Jumu''ah and community events.',
  'Unterstütze die Vorbereitung eines zusätzlichen Raums für Jumu''ah und Gemeindeveranstaltungen.',
  'Cuma namazı ve topluluk etkinlikleri için ek alan hazırlanmasına destek olun.',
  3000, 1250, '2026-06-01', '2026-08-31', true, true
),
(
  gen_random_uuid(),
  'دروس القرآن للأطفال',
  'دروس القرآن للأطفال',
  'Children''s Qur''an classes',
  'Qur''an-Unterricht für Kinder',
  'Çocuklar için Kur''an dersleri',
  'دعم مواد تعليمية وأنشطة أسبوعية للأطفال.',
  'دعم مواد تعليمية وأنشطة أسبوعية للأطفال.',
  'Support learning materials and weekly activities for children.',
  'Unterstütze Lernmaterialien und wöchentliche Aktivitäten für Kinder.',
  'Çocuklar için eğitim materyallerini ve haftalık etkinlikleri destekleyin.',
  900, 420, '2026-06-10', '2026-07-31', true, false
) ON CONFLICT DO NOTHING;

-- ============================================
-- 3. DONATIONS
-- ============================================
INSERT INTO public.donations (amount, purpose, donor_name, received_at, method) VALUES
  (100, 'تبرع لمسجد ديغندورف', 'أحمد محمد', '2026-06-01', 'Bank transfer'),
  (50, 'تبرع لمسجد ديغندورف', 'Fatima Ali', '2026-06-05', 'Bank transfer'),
  (200, 'تبرع لمسجد ديغندورف', 'Omar Hassan', '2026-06-10', 'PayPal'),
  (75, 'تبرع لمسجد ديغندورف', 'Aisha Rahman', '2026-06-12', 'Cash'),
  (150, 'تبرع لمسجد ديغندورف', 'Yusuf Ibrahim', '2026-06-15', 'Bank transfer'),
  (300, 'تبرع لمسجد ديغندورف', 'Khalid Said', '2026-06-18', 'PayPal'),
  (40, 'تبرع لمسجد ديغندورف', 'Noor Khalil', '2026-06-20', 'Cash'),
  (250, 'تبرع لمسجد ديغندورف', 'Mustafa Karim', '2026-06-22', 'Bank transfer'),
  (120, 'تبرع لمسجد ديغندورف', 'Sana Farid', '2026-06-24', 'PayPal'),
  (180, 'تبرع لمسجد ديغندورف', 'Hassan Nour', '2026-06-25', 'Bank transfer');

-- ============================================
-- 4. DONATION REPORTS
-- ============================================
INSERT INTO public.donation_reports (month, monthly_need, donations_received, remaining) VALUES
  ('2026-06', 3000, 1250, 1750)
ON CONFLICT (month) DO NOTHING;

-- ============================================
-- 5. ANNOUNCEMENTS
-- ============================================
INSERT INTO public.announcements (
  title, title_ar, title_en, title_de, title_tr,
  message, message_ar, message_en, message_de, message_tr,
  type, is_urgent, published, created_at
) VALUES
(
  'تحديث مهم عن الجمعة',
  'تحديث مهم عن الجمعة',
  'Important Jumu''ah update',
  'Wichtige Jumu''ah-Information',
  'Önemli Cuma duyurusu',
  'سيتم فتح القاعة الإضافية هذا الأسبوع بسبب كثافة الحضور.',
  'سيتم فتح القاعة الإضافية هذا الأسبوع بسبب كثافة الحضور.',
  'The extra hall will be opened this week because higher attendance is expected.',
  'Der Zusatzraum wird diese Woche wegen erwarteter hoher Teilnahme geöffnet.',
  'Bu hafta yoğun katılım beklendiği için ek salon açılacaktır.',
  'Urgent', true, true, '2026-06-27T09:00:00Z'
),
(
  'تنظيف المسجد يوم السبت',
  'تنظيف المسجد يوم السبت',
  'Masjid cleaning on Saturday',
  'Moschee-Reinigung am Samstag',
  'Cumartesi mescit temizliği',
  'نحتاج متطوعين بعد صلاة الظهر للمساعدة في ترتيب وتنظيف المسجد.',
  'نحتاج متطوعين بعد صلاة الظهر للمساعدة في ترتيب وتنظيف المسجد.',
  'Volunteers are needed after Dhuhr to help clean and organize the masjid.',
  'Nach Dhuhr werden Helfer für Reinigung und Organisation der Moschee gesucht.',
  'Öğle namazından sonra mescidi temizlemek ve düzenlemek için gönüllülere ihtiyaç var.',
  'Community', false, true, '2026-06-26T18:00:00Z'
),
(
  'جدول رمضان التجريبي متاح',
  'جدول رمضان التجريبي متاح',
  'Preview Ramadan schedule is available',
  'Demo-Ramadanplan ist verfügbar',
  'Demo Ramazan takvimi hazır',
  'تمت إضافة مواعيد تجريبية للإمساك والإفطار والتراويح للعرض المحلي.',
  'تمت إضافة مواعيد تجريبية للإمساك والإفطار والتراويح للعرض المحلي.',
  'Preview imsak, iftar, and taraweeh times were added for local display.',
  'Demo-Zeiten für Imsak, Iftar und Taraweeh wurden für die lokale Ansicht hinzugefügt.',
  'Yerel görünüm için demo imsak, iftar ve teravih saatleri eklendi.',
  'Ramadan', false, true, '2026-06-25T18:00:00Z'
),
(
  'حلقة القرآن الجمعة القادمة',
  'حلقة القرآن الجمعة القادمة',
  'Qur''an circle next Friday',
  'Qur''an-Kreis nächsten Freitag',
  'Gelecek Cuma Kur''an halkası',
  'حلقة تعليمية للكبار والصغار بعد صلاة العصر.',
  'حلقة تعليمية للكبار والصغار بعد صلاة العصر.',
  'An educational circle for adults and children after Asr prayer.',
  'Eine Lerneinheit für Erwachsene und Kinder nach dem Asr-Gebet.',
  'Asr namazından sonra yetişkinler ve çocuklar için eğitim halkası.',
  'Community', false, true, '2026-06-24T14:00:00Z'
),
(
  'تغيير موقف السيارات المؤقت',
  'تغيير موقف السيارات المؤقت',
  'Temporary parking change',
  'Temporäre Parkplatzänderung',
  'Geçici otopark değişikliği',
  'يرجى استخدام الموقف المؤقت بجانب المسجد يوم الجمعة.',
  'يرجى استخدام الموقف المؤقت بجانب المسجد يوم الجمعة.',
  'Please use the temporary parking lot next to the mosque on Friday.',
  'Bitte benutzen Sie am Freitag den temporären Parkplatz neben der Moschee.',
  'Cuma günü mescidin yanındaki geçici otoparkı kullanın lütfen.',
  'Location update', false, true, '2026-06-23T10:00:00Z'
);

-- ============================================
-- 6. EVENTS
-- ============================================
INSERT INTO public.events (
  title, title_ar, title_en, title_de, title_tr,
  description, description_ar, description_en, description_de, description_tr,
  date, start_time, end_time, location, location_ar, location_en, location_de, location_tr,
  type, published, updated_at
) VALUES
(
  'حلقة القرآن للأطفال',
  'حلقة القرآن للأطفال',
  'Children''s Qur''an circle',
  'Qur''an-Kreis für Kinder',
  'Çocuk Kur''an halkası',
  'جلسة تعليمية قصيرة للأطفال مع مراجعة سور قصيرة.',
  'جلسة تعليمية قصيرة للأطفال مع مراجعة سور قصيرة.',
  'A short learning session for children with revision of short surahs.',
  'Kurze Lerneinheit für Kinder mit Wiederholung kurzer Suren.',
  'Çocuklar için kısa sure tekrarıyla kısa bir ders.',
  '2026-07-04', '16:00', '17:30',
  'Masjid Deggendorf', 'مسجد ديغندورف', 'Masjid Deggendorf', 'Moschee Deggendorf', 'Deggendorf Mescidi',
  'Class', true, NOW()
),
(
  'لقاء المجتمع بعد الجمعة',
  'لقاء المجتمع بعد الجمعة',
  'Community tea after Jumu''ah',
  'Gemeindetee nach Jumu''ah',
  'Cuma sonrası topluluk çayı',
  'لقاء بسيط للتعارف بين أفراد المجتمع بعد صلاة الجمعة.',
  'لقاء بسيط للتعارف بين أفراد المجتمع بعد صلاة الجمعة.',
  'A simple gathering for the community after Jumu''ah prayer.',
  'Ein einfaches Treffen der Gemeinde nach dem Freitagsgebet.',
  'Cuma namazından sonra topluluk için basit bir buluşma.',
  '2026-07-10', '14:00', '15:00',
  'Community room', 'قاعة المجتمع', 'Community room', 'Gemeinderaum', 'Topluluk odası',
  'Community', true, NOW()
),
(
  'دورة تعليم الوضوء',
  'دورة تعليم الوضوء',
  'Wudu workshop',
  'Wudu-Workshop',
  'Abdest eğitimi atölyesi',
  'دورة تعليمية للأطفال الجدد عن كيفية الوضوء الصحيح.',
  'دورة تعليمية للأطفال الجدد عن كيفية الوضوء الصحيح.',
  'An educational workshop for new children about correct wudu.',
  'Ein Bildungsworkshop für neue Kinder über korrektes Wudu.',
  'Yeni çocuklar için doğru abdest eğitimi atölyesi.',
  '2026-07-15', '10:00', '12:00',
  'Masjid Deggendorf', 'مسجد ديغندورف', 'Masjid Deggendorf', 'Moschee Deggendorf', 'Deggendorf Mescidi',
  'Class', true, NOW()
),
(
  'سهرة العائلات',
  'سهرة العائلات',
  'Family evening gathering',
  'Familienabend',
  'Aile akşamı',
  'لقاء عائلي للتواصل والتعارف بين أسر المجتمع.',
  'لقاء عائلي للتواصل والتعارف بين أسر المجتمع.',
  'A family evening for socializing and meeting other families.',
  'Ein Familienabend zum Kennenlernen und Austausch.',
  'Aileler arası sosyalleşme ve tanışma için aile akşamı.',
  '2026-07-18', '18:00', '21:00',
  'Community hall', 'قاعة المجتمع', 'Community hall', 'Gemeindesaal', 'Topluluk salonu',
  'Community', true, NOW()
),
(
  'نشاط شبابي رياضي',
  'نشاط شبابي رياضي',
  'Youth sports activity',
  'Jugend-Sportaktivität',
  'Gençlik spor etkinliği',
  'مباراة ودية لكرة القدم للشباب في الملعب المجاور.',
  'مباراة ودية لكرة القدم للشباب في الملعب المجاور.',
  'A friendly football match for youth at the nearby field.',
  'Ein Freundschaftsspiel für Jugendliche auf dem nahegelegenen Platz.',
  'Gençler için yakındaki sahada dostluk maçı.',
  '2026-07-20', '15:00', '17:00',
  'Sports field', 'الملعب الرياضي', 'Sports field', 'Sportplatz', 'Spor sahası',
  'Youth', true, NOW()
);
