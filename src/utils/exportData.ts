import type { Task } from "@/hooks/useTasks"
import type { CustomFieldDef } from "@/hooks/useCustomFields"
import type { DailyStats } from "./dailyStats"

function downloadBlob(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function csvEscape(value: string | number | boolean) {
  const s = String(value)
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return '"' + s.replace(/"/g, '""') + '"'
  }
  return s
}

export function exportDailyStatsCSV(stats: Record<string, DailyStats>) {
  const rows = ["date,focusSeconds,sessions,deepFocusSeconds"]
  Object.keys(stats)
    .sort()
    .forEach((date) => {
      const s = stats[date]
      rows.push([date, s.focusSeconds, s.sessions, s.deepFocusSeconds].join(","))
    })
  downloadBlob("pomodoro-estatisticas.csv", rows.join("\n"), "text/csv;charset=utf-8")
}

export function exportDailyStatsJSON(stats: Record<string, DailyStats>) {
  downloadBlob("pomodoro-estatisticas.json", JSON.stringify(stats, null, 2), "application/json")
}

export function exportTasksCSV(tasks: Task[], fields: CustomFieldDef[] = []) {
  const header = [
    "title",
    "status",
    "priority",
    "estimatedPomodoros",
    "completedPomodoros",
    "focusSeconds",
    "createdAt",
    "completedAt",
    ...fields.map((f) => f.name)
  ].join(",")
  const rows = tasks.map((t) =>
    [
      csvEscape(t.title),
      t.status,
      t.priority,
      t.estimatedPomodoros,
      t.completedPomodoros,
      t.focusSeconds,
      t.createdAt,
      t.completedAt ?? "",
      ...fields.map((f) => {
        const value = t.customFields[f.id]
        if (f.type === "checkbox") return value ? "Sim" : "Não"
        return csvEscape(value ?? "")
      })
    ].join(",")
  )
  downloadBlob("pomodoro-tarefas.csv", [header, ...rows].join("\n"), "text/csv;charset=utf-8")
}

export function exportTasksJSON(tasks: Task[]) {
  downloadBlob("pomodoro-tarefas.json", JSON.stringify(tasks, null, 2), "application/json")
}
