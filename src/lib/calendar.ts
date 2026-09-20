export const WEEKLY_CONTENT_CALENDAR: Record<string, string> = {
  Monday: "Web Development",
  Tuesday: "Python",
  Wednesday: "Artificial Intelligence",
  Thursday: "Machine Learning",
  Friday: "Mobile Application Development",
  Saturday: "Software Engineering / Developer Tools",
  Sunday: "Weekly Technology Insight",
};

export interface KarachiDateInfo {
  year: string;
  month: string;
  day: string;
  weekday: string;
  dateStr: string;
  executionId: string;
  category: string;
}

/**
 * Returns the current date, weekday, execution ID, and category in Asia/Karachi.
 * Accepts an optional reference Date for testing.
 */
export function getKarachiDateInfo(date: Date = new Date()): KarachiDateInfo {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Karachi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "long",
  });

  const parts = formatter.formatToParts(date);
  const getPart = (type: string) => parts.find((p) => p.type === type)?.value || "";

  const year = getPart("year");
  const month = getPart("month");
  const day = getPart("day");
  const weekday = getPart("weekday");
  const dateStr = `${year}-${month}-${day}`;
  const executionId = `linkedin-daily-${dateStr}`;
  const category = WEEKLY_CONTENT_CALENDAR[weekday] || "Technology & Software Development";

  return {
    year,
    month,
    day,
    weekday,
    dateStr,
    executionId,
    category,
  };
}
