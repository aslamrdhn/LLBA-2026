export function getBusinessDate(
  timezone: string = "Asia/Jakarta",
  date: Date = new Date(),
): Date {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const dateStr = formatter.format(date); // YYYY-MM-DD
  return new Date(`${dateStr}T00:00:00.000Z`);
}
