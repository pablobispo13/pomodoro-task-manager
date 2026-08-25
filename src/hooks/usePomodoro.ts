import { useEffect, useMemo, useRef, useState } from "react"
import { DEFAULT_SETTINGS, type PomodoroSettings } from "./useSettings"
import { EMPTY_STATS, loadDailyStats, persistDailyStats, todayKey, type DailyStats } from "@/utils/dailyStats"

export type Mode = "focus" | "shortBreak" | "longBreak"

export function usePomodoro(config?: PomodoroSettings) {
  const cfg = { ...DEFAULT_SETTINGS, ...config }

  const times = useMemo(
    () => ({
      focus: cfg.focusDuration * 60,
      shortBreak: cfg.shortBreakDuration * 60,
      longBreak: cfg.longBreakDuration * 60
    }),
    [cfg.focusDuration, cfg.shortBreakDuration, cfg.longBreakDuration]
  )

  const [mode, setMode] = useState<Mode>("focus")
  const [time, setTime] = useState(times.focus)
  const [running, setRunning] = useState(false)

  // Lazy-init pattern: read once on first render, mutate in place afterwards —
  // only ever touched from effects/callbacks, never read during render itself.
  const statsMapRef = useRef<Record<string, DailyStats> | null>(null)
  if (statsMapRef.current === null) statsMapRef.current = loadDailyStats()

  const [dailyFocus, setDailyFocus] = useState(
    () => loadDailyStats()[todayKey()]?.focusSeconds ?? EMPTY_STATS.focusSeconds
  )
  const [sessions, setSessions] = useState(
    () => loadDailyStats()[todayKey()]?.sessions ?? EMPTY_STATS.sessions
  )
  const [deepFocus, setDeepFocus] = useState(
    () => loadDailyStats()[todayKey()]?.deepFocusSeconds ?? EMPTY_STATS.deepFocusSeconds
  )

  function persistTodayField(field: keyof DailyStats, value: number) {
    const map = statsMapRef.current!
    const key = todayKey()
    const current = map[key] ?? EMPTY_STATS
    map[key] = { ...current, [field]: value }
    persistDailyStats(map)
  }

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  // timeRef is the source-of-truth for the interval tick —
  // avoids calling setState inside a setState updater (React may call updaters twice)
  const timeRef = useRef(times.focus)
  const modeRef = useRef(mode)
  const timesRef = useRef(times)
  const sessionsRef = useRef(sessions)
  const sessionsBeforeLongRef = useRef(cfg.sessionsBeforeLongBreak)
  const autoStartBreaksRef = useRef(cfg.autoStartBreaks)
  const focusLengthRef = useRef(0)
  const runningRef = useRef(running)

  useEffect(() => { modeRef.current = mode }, [mode])
  useEffect(() => { sessionsRef.current = sessions }, [sessions])
  useEffect(() => { runningRef.current = running }, [running])
  useEffect(() => { sessionsBeforeLongRef.current = cfg.sessionsBeforeLongBreak }, [cfg.sessionsBeforeLongBreak])
  useEffect(() => { autoStartBreaksRef.current = cfg.autoStartBreaks }, [cfg.autoStartBreaks])

  function setTimeBoth(v: number) {
    timeRef.current = v
    setTime(v)
  }

  useEffect(() => {
    timesRef.current = times
    if (!runningRef.current) {
      setTimeBoth(times[modeRef.current])
    }
  }, [times])

  useEffect(() => {
    if (!running) return

    intervalRef.current = setInterval(() => {
      const t = timeRef.current
      const currentMode = modeRef.current

      // Increment focus counters directly in the interval callback —
      // NOT inside a setState updater, which React may call twice in strict mode
      if (currentMode === "focus") {
        focusLengthRef.current += 1
        setDailyFocus((f) => {
          const next = f + 1
          persistTodayField("focusSeconds", next)
          return next
        })
      }

      if (t <= 1) {
        if (currentMode === "focus") {
          const nextSessions = sessionsRef.current + 1
          setSessions(nextSessions)
          persistTodayField("sessions", nextSessions)

          if (focusLengthRef.current >= 15 * 60) {
            const focusLen = focusLengthRef.current
            setDeepFocus((d) => {
              const next = d + focusLen
              persistTodayField("deepFocusSeconds", next)
              return next
            })
          }
          focusLengthRef.current = 0

          const nextMode: Mode =
            nextSessions % sessionsBeforeLongRef.current === 0 ? "longBreak" : "shortBreak"
          setMode(nextMode)
          setRunning(autoStartBreaksRef.current)
          setTimeBoth(timesRef.current[nextMode])
        } else {
          setMode("focus")
          setRunning(false)
          setTimeBoth(timesRef.current.focus)
        }
      } else {
        setTimeBoth(t - 1)
      }
    }, 1000)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [running])

  function start() {
    setRunning(true)
  }

  function pause() {
    setRunning(false)
  }

  function reset() {
    setRunning(false)
    setTimeBoth(timesRef.current[modeRef.current])
  }

  function skip() {
    const nextMode: Mode = modeRef.current === "focus" ? "shortBreak" : "focus"
    setMode(nextMode)
    setTimeBoth(timesRef.current[nextMode])
    setRunning(false)
  }

  function addTime(seconds: number) {
    setTimeBoth(timeRef.current + seconds)
  }

  const totalTime = times[mode]
  const sessionInCycle = (sessions % cfg.sessionsBeforeLongBreak) + 1

  return {
    time,
    totalTime,
    running,
    mode,
    sessionInCycle,
    sessionsBeforeLongBreak: cfg.sessionsBeforeLongBreak,
    sessions,
    dailyFocus,
    deepFocus,
    start,
    pause,
    reset,
    skip,
    addTime
  }
}
