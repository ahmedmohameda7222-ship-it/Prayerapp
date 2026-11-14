import type { DisplayPrayerDay } from "../../lib/feed-types";

export function MaghribProgramSlide({ day }: { day: DisplayPrayerDay }) {
  const program = day.maghribProgram;
  if (!program?.enabled) return null;

  return (
    <article className="content-slide maghrib-program-slide">
      <div className="maghrib-lesson">
        <span className="hero-kicker">MAGHRIB-PROGRAMM · برنامج المغرب</span>
        {program.lessonTitle ? <h2 dir="rtl" lang="ar">{program.lessonTitle}</h2> : null}
        {program.lessonDurationMinutes !== null ? (
          <p>{program.lessonDurationMinutes} min · مدة الدرس</p>
        ) : null}
      </div>
      {program.combinedIshaTime ? (
        <div className="maghrib-combined">
          <p>Gemeinsames Isha-Gebet</p>
          <strong>{program.combinedIshaTime}</strong>
          <p dir="rtl" lang="ar">موعد العشاء الموحّد</p>
        </div>
      ) : null}
    </article>
  );
}
