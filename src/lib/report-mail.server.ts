import type { AttendanceRow, Student } from "./store";
import { absenceEmail, absenceSummary, istanbulToday, kindRange, reportTargets, type ReportKind } from "./absence-report";
import { sendGmail } from "./gmail.server";

type Sub = { recipients: string[]; daily_recipients?: string[] | null; students: unknown; attendance: unknown };

export async function sendReportFor(sub: Sub, kind: ReportKind, today = istanbulToday()) {
  const to = reportTargets(kind, sub.recipients, sub.daily_recipients);
  if (!to.length) return;
  const range = kindRange(kind, today);
  const lines = absenceSummary(sub.students as Student[], sub.attendance as AttendanceRow[], range);
  const { subject, html } = absenceEmail(kind, range, lines);
  await sendGmail(to, subject, html);
}
