import { useEffect, useRef, useState } from "react"

// A plain stopwatch — no focus/break cycle, no fixed duration. Used for the
// "meeting" task kind, which just counts elapsed time until stopped.
export function useMeetingTimer() {
  const [running, setRunning] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!running) return

    intervalRef.current = setInterval(() => {
      setElapsed((e) => e + 1)
    }, 1000)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [running])

  function start() {
    setElapsed(0)
    setRunning(true)
  }

  function stop() {
    setRunning(false)
  }

  return { running, elapsed, start, stop }
}
