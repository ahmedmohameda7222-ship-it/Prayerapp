-- Prayer engine precision calibration. Schema only: NO prayers, settings profiles,
-- or photographed reference times are inserted or updated by this migration.
--
-- Existing integer offsets are preserved exactly as numeric values. Fractional
-- minutes allow date-independent sub-minute astronomical adjustments to be
-- applied before Prayerapp's final local-minute ceiling.
alter table public.prayer_settings
  alter column fajr_offset_minutes type numeric(9,5) using fajr_offset_minutes::numeric(9,5),
  alter column sunrise_offset_minutes type numeric(9,5) using sunrise_offset_minutes::numeric(9,5),
  alter column dhuhr_offset_minutes type numeric(9,5) using dhuhr_offset_minutes::numeric(9,5),
  alter column asr_offset_minutes type numeric(9,5) using asr_offset_minutes::numeric(9,5),
  alter column maghrib_offset_minutes type numeric(9,5) using maghrib_offset_minutes::numeric(9,5),
  alter column isha_offset_minutes type numeric(9,5) using isha_offset_minutes::numeric(9,5);

-- 0 preserves legacy Maghrib-at-sunset behavior. The angle is a separate,
-- operator-configurable astronomical input, not a hardcoded city/day override.
alter table public.prayer_settings
  add column maghrib_angle numeric(6,3) not null default 0
    check (maghrib_angle >= 0 and maghrib_angle <= 30);

comment on column public.prayer_settings.maghrib_angle is
  'Optional astronomical solar-depression angle in degrees for Maghrib; 0 uses sunset. Must be operator approved.';

comment on column public.prayer_settings.fajr_offset_minutes is
  'Operator-controlled astronomical offset in fractional minutes, applied before final minute rounding.';
comment on column public.prayer_settings.sunrise_offset_minutes is
  'Operator-controlled astronomical offset in fractional minutes, applied before final minute rounding.';
comment on column public.prayer_settings.dhuhr_offset_minutes is
  'Operator-controlled astronomical offset in fractional minutes, applied before final minute rounding.';
comment on column public.prayer_settings.asr_offset_minutes is
  'Operator-controlled astronomical offset in fractional minutes, applied before final minute rounding.';
comment on column public.prayer_settings.maghrib_offset_minutes is
  'Operator-controlled astronomical offset in fractional minutes, applied before final minute rounding.';
comment on column public.prayer_settings.isha_offset_minutes is
  'Operator-controlled astronomical offset in fractional minutes, applied before final minute rounding.';
