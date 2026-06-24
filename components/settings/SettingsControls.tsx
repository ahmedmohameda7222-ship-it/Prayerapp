"use client";

import { useState } from "react";
import { Bell, Clock, Languages, Moon } from "lucide-react";
import { Card } from "@/components/ui/Card";

const languages = ["English", "German", "Arabic"];
const notifications = ["Prayer time notifications", "Iqama notifications", "Jumu'ah notifications", "Announcement notifications", "Azkar reminders"];

export function SettingsControls() {
  const [language, setLanguage] = useState("English");
  const [timeFormat, setTimeFormat] = useState("24-hour");

  return (
    <div className="grid gap-5">
      <Card>
        <h2 className="mb-3 flex items-center gap-2 font-bold text-[var(--color-emerald)]"><Languages className="h-5 w-5" /> Language</h2>
        <div className="grid grid-cols-3 gap-2">
          {languages.map((item) => (
            <button key={item} onClick={() => setLanguage(item)} className={`min-h-11 rounded-2xl border px-2 text-sm font-bold ${language === item ? "border-[var(--color-emerald)] bg-[var(--color-emerald)] text-[var(--color-card)]" : "border-[var(--color-border)] bg-[var(--color-cream)] text-[var(--color-emerald)]"}`}>{item}</button>
          ))}
        </div>
      </Card>
      <Card>
        <h2 className="mb-3 flex items-center gap-2 font-bold text-[var(--color-emerald)]"><Bell className="h-5 w-5" /> Notifications</h2>
        <div className="grid gap-3">
          {notifications.map((item, index) => (
            <label key={item} className="flex items-center justify-between rounded-2xl bg-[var(--color-cream)] p-3 text-sm font-bold">
              {item}
              <input type="checkbox" defaultChecked={index < 2} className="h-5 w-5 accent-[var(--color-emerald)]" />
            </label>
          ))}
        </div>
      </Card>
      <Card>
        <h2 className="mb-3 flex items-center gap-2 font-bold text-[var(--color-emerald)]"><Clock className="h-5 w-5" /> Time Format</h2>
        <div className="grid grid-cols-2 gap-2">
          {["24-hour", "12-hour"].map((item) => (
            <button key={item} onClick={() => setTimeFormat(item)} className={`min-h-11 rounded-2xl border text-sm font-bold ${timeFormat === item ? "border-[var(--color-gold)] bg-[var(--color-gold)] text-[var(--color-emerald-dark)]" : "border-[var(--color-border)] bg-[var(--color-cream)] text-[var(--color-emerald)]"}`}>{item}</button>
          ))}
        </div>
      </Card>
      <Card>
        <h2 className="mb-3 flex items-center gap-2 font-bold text-[var(--color-emerald)]"><Moon className="h-5 w-5" /> Theme</h2>
        <div className="grid grid-cols-2 gap-2">
          <button className="min-h-11 rounded-2xl bg-[var(--color-emerald)] text-sm font-bold text-[var(--color-card)]">Light</button>
          <button className="min-h-11 rounded-2xl border border-[var(--color-border)] text-sm font-bold text-[var(--color-muted)]">Dark placeholder</button>
        </div>
      </Card>
    </div>
  );
}
