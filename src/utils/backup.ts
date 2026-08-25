import { STORAGE_KEY as TASKS_KEY } from "@/hooks/useTasks"
import { STORAGE_KEY as SETTINGS_KEY } from "@/hooks/useSettings"
import { STORAGE_KEY as COLUMNS_KEY } from "@/hooks/useColumns"
import { STORAGE_KEY as FIELDS_KEY } from "@/hooks/useCustomFields"
import { STORAGE_KEY as DAILY_STATS_KEY } from "./dailyStats"

// Every localStorage key this app persists — kept as a single list so backup
// and restore can never drift from what each hook actually reads/writes.
const BACKUP_KEYS = [TASKS_KEY, SETTINGS_KEY, COLUMNS_KEY, FIELDS_KEY, DAILY_STATS_KEY] as const

const BACKUP_VERSION = 1

type BackupFile = {
  app: "pomodoro-task-manager"
  version: number
  exportedAt: string
  data: Record<string, unknown>
}

function buildBackup(): BackupFile {
  const data: Record<string, unknown> = {}
  for (const key of BACKUP_KEYS) {
    const raw = localStorage.getItem(key)
    if (raw === null) continue
    try {
      data[key] = JSON.parse(raw)
    } catch {
      data[key] = raw
    }
  }
  return { app: "pomodoro-task-manager", version: BACKUP_VERSION, exportedAt: new Date().toISOString(), data }
}

export function exportAllData() {
  const backup = buildBackup()
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `pomodoro-backup-${new Date().toISOString().slice(0, 10)}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export type ImportResult = { ok: true; keysImported: number } | { ok: false; error: string }

export function importAllData(json: string): ImportResult {
  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch {
    return { ok: false, error: "Arquivo inválido: não é um JSON válido." }
  }

  if (
    !parsed ||
    typeof parsed !== "object" ||
    !("data" in parsed) ||
    typeof (parsed as BackupFile).data !== "object"
  ) {
    return { ok: false, error: "Arquivo não reconhecido como um backup deste app." }
  }

  const { data } = parsed as BackupFile
  let keysImported = 0
  for (const key of BACKUP_KEYS) {
    if (key in data) {
      localStorage.setItem(key, JSON.stringify(data[key]))
      keysImported++
    }
  }

  if (keysImported === 0) {
    return { ok: false, error: "O backup não contém nenhum dado reconhecido." }
  }

  return { ok: true, keysImported }
}
