export type DailyStats = {
  focusSeconds: number
  sessions: number
  deepFocusSeconds: number
}

export const EMPTY_STATS: DailyStats = { focusSeconds: 0, sessions: 0, deepFocusSeconds: 0 }

export const STORAGE_KEY = "daily-stats"
const LEGACY_PREFIXES = { focusSeconds: "focus-", sessions: "sessions-", deepFocusSeconds: "deep-" } as const

export function todayKey() {
  return new Date().toISOString().slice(0, 10)
}

// One-time migration from the old per-day, per-metric keys (focus-2026-08-24, ...)
// into a single consolidated object, so historical data isn't lost when this ships.
function migrateLegacyKeys(): Record<string, DailyStats> {
  const dates = new Set<string>()
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (!key) continue
    for (const prefix of Object.values(LEGACY_PREFIXES)) {
      if (key.startsWith(prefix)) dates.add(key.slice(prefix.length))
    }
  }

  const migrated: Record<string, DailyStats> = {}
  dates.forEach((date) => {
    migrated[date] = {
      focusSeconds: Number(localStorage.getItem(LEGACY_PREFIXES.focusSeconds + date) ?? 0),
      sessions: Number(localStorage.getItem(LEGACY_PREFIXES.sessions + date) ?? 0),
      deepFocusSeconds: Number(localStorage.getItem(LEGACY_PREFIXES.deepFocusSeconds + date) ?? 0)
    }
  })
  return migrated
}

export function loadDailyStats(): Record<string, DailyStats> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) return JSON.parse(stored)
  } catch {
    // corrupt entry — fall through to migration/empty
  }

  const migrated = migrateLegacyKeys()
  if (Object.keys(migrated).length > 0) persistDailyStats(migrated)
  return migrated
}

export function persistDailyStats(data: Record<string, DailyStats>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}
