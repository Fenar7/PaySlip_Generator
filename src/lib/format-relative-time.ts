const RTF = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

function toUnit(seconds: number): [Intl.RelativeTimeFormatUnit, number] {
  const abs = Math.abs(seconds);

  if (abs < 60) return ["second", Math.round(seconds)];

  const minutes = seconds / 60;
  if (Math.abs(minutes) < 60) return ["minute", Math.round(minutes)];

  const hours = minutes / 60;
  if (Math.abs(hours) < 24) return ["hour", Math.round(hours)];

  const days = hours / 24;
  if (Math.abs(days) < 7) return ["day", Math.round(days)];

  const weeks = days / 7;
  if (Math.abs(weeks) < 5) return ["week", Math.round(weeks)];

  const months = days / 30;
  if (Math.abs(months) < 12) return ["month", Math.round(months)];

  const years = days / 365;
  return ["year", Math.round(years)];
}

export function formatRelativeTime(date: Date | string | number): string {
  const target = new Date(date).getTime();
  const now = Date.now();
  const seconds = (target - now) / 1000;
  const [unit, value] = toUnit(seconds);
  return RTF.format(value, unit);
}
