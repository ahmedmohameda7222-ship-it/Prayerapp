import type { DisplayPrayerDay } from "../../lib/feed-types";

export function MaghribProgramSlide({ day }: { day: DisplayPrayerDay }) {
  const program = day.maghribProgram;
  if (!program?.enabled) return null;

  return (
    <article className="content-slide maghrib-program-slide">
      <div>
        <p>Maghrib-Programm</p>
        <p dir="rtl">برنامج المغرب</p>
      </div>
      {program.lessonTitle ? <h2 dir="rtl">{program.lessonTitle}</h2> : null}
      {program.lessonDurationMinutes !== null ? (
        <p>{program.lessonDurationMinutes} min</p>
      ) : null}
      {program.combinedIshaTime ? (
        <p>
          Gemeinsame Isha / العشاء الموحّد: <strong>{program.combinedIshaTime}</strong>
        </p>
      ) : null}
    </article>
  );
}
