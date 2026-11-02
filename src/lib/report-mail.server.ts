import type { AttendanceRow, Student } from "./store";
import { absenceEmail, absenceSummary, istanbulToday, kindRange, type ReportKind } from "./absence-report";
import { sendGmail } from "./gmail.server";

type Sub = { recipients: string[]; students: unknown; attendance: unknown };

export async function sendReportFor(sub: Sub, kind: ReportKind, today = istanbulToday()) {
  if (!sub.recipients.length) return;
  const range = kindRange(kind, today);
  const lines = absenceSummary(sub.students as Student[], sub.attendance as AttendanceRow[], range);
  const { subject, html } = absenceEmail(kind, range, lines);
  await sendGmail(sub.recipients, subject, html);
}
