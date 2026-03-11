import { useEffect, useRef, useState } from "react"

export type Mode = "focus" | "shortBreak" | "longBreak"

type Times = {
  focus: number
  shortBreak: number
  longBreak: number
}

function todayKey() {
  return new Date().toISOString().slice(0, 10)
}

export function usePomodoro() {

  const [times] = useState<Times>({
    focus: 25 * 60,
    shortBreak: 5 * 60,
    longBreak: 15 * 60
  })

  const [mode, setMode] = useState<Mode>("focus")
  const [time, setTime] = useState(times.focus)
  const [running, setRunning] = useState(false)
  const [cycle, setCycle] = useState(0)

  const [dailyFocus, setDailyFocus] = useState(0)
  const [sessions, setSessions] = useState(0)
  const [deepFocus, setDeepFocus] = useState(0)

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const modeRef = useRef(mode)
  const cycleRef = useRef(cycle)
  const timesRef = useRef(times)
  const focusLengthRef = useRef(0)

  useEffect(() => { modeRef.current = mode }, [mode])
  useEffect(() => { cycleRef.current = cycle }, [cycle])
  useEffect(() => { timesRef.current = times }, [times])

  useEffect(() => {

    const focusKey = "focus-" + todayKey()
    const sessionKey = "sessions-" + todayKey()
    const deepKey = "deep-" + todayKey()

    const savedFocus = localStorage.getItem(focusKey)
    const savedSessions = localStorage.getItem(sessionKey)
    const savedDeep = localStorage.getItem(deepKey)

    if (savedFocus) setDailyFocus(Number(savedFocus))
    if (savedSessions) setSessions(Number(savedSessions))
    if (savedDeep) setDeepFocus(Number(savedDeep))

  }, [])

  useEffect(() => {

    if (!running) return

    intervalRef.current = setInterval(() => {

      setTime((t) => {

        if (modeRef.current === "focus") {

          focusLengthRef.current += 1

          setDailyFocus((f) => {
            const updated = f + 1
            localStorage.setItem("focus-" + todayKey(), String(updated))
            return updated
          })

        }

        if (t <= 1) {

          const nextCycle = cycleRef.current + 1
          setCycle(nextCycle)

          let nextMode: Mode

          if (modeRef.current === "focus") {

            setSessions((s) => {
              const updated = s + 1
              localStorage.setItem("sessions-" + todayKey(), String(updated))
              return updated
            })

            if (focusLengthRef.current >= 15 * 60) {
              setDeepFocus((d) => {
                const updated = d + focusLengthRef.current
                localStorage.setItem("deep-" + todayKey(), String(updated))
                return updated
              })
            }

            focusLengthRef.current = 0

            nextMode = nextCycle % 4 === 0 ? "longBreak" : "shortBreak"

            setRunning(true) // break inicia automático

          } else {

            nextMode = "focus"
            setRunning(false) // espera start manual

          }

          setMode(nextMode)

          return timesRef.current[nextMode]
        }

        return t - 1

      })

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
    setTime(timesRef.current[modeRef.current])
  }

  function skip() {

    let nextMode: Mode

    if (modeRef.current === "focus") {
      nextMode = "shortBreak"
    } else {
      nextMode = "focus"
    }

    setMode(nextMode)
    setTime(timesRef.current[nextMode])
    setRunning(false)

  }

  function addTime(seconds: number) {
    setTime((t) => t + seconds)
  }

  const totalTime = times[mode]

  return {
    time,
    totalTime,
    running,
    mode,
    cycle,
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