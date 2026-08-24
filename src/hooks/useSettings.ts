import { useState } from "react"
import { type AccentColor, DEFAULT_ACCENT } from "@/utils/accentColors"

export type PomodoroSettings = {
  focusDuration: number
  shortBreakDuration: number
  longBreakDuration: number
  autoStartBreaks: boolean
  sessionsBeforeLongBreak: number
  accentColor: AccentColor
}

export const DEFAULT_SETTINGS: PomodoroSettings = {
  focusDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  autoStartBreaks: true,
  sessionsBeforeLongBreak: 4,
  accentColor: DEFAULT_ACCENT
}

const STORAGE_KEY = "pomodoro-settings"

export function useSettings() {
  const [settings, setSettings] = useState<PomodoroSettings>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) }
    } catch {
      // Corrupt localStorage entry — fall back to defaults
    }
    return DEFAULT_SETTINGS
  })

  function update(partial: Partial<PomodoroSettings>) {
    setSettings((prev) => {
      const next = { ...prev, ...partial }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }

  function reset() {
    setSettings(DEFAULT_SETTINGS)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SETTINGS))
  }

  return { settings, update, reset }
}
