import type { Student } from "./store";

/** Stable trial identifiers make repeated additions harmless to existing data. */
export function withTrialStudents(students: Student[]): Student[] {
  const existing = new Set(students.map((student) => student.id));
  const trial = Array.from({ length: 55 }, (_, index): Student => ({
    id: `trial-student-${index + 1}`,
    name: `Deneme Talebesi ${String(index + 1).padStart(2, "0")}`,
    age: "", group: "Deneme", city: "", startDate: "", guardian: "", phone: "", status: "İyi",
  }));
  return [...students, ...trial.filter((student) => !existing.has(student.id))];
}