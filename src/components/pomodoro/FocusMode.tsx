import { useEffect, useRef } from "react"
import { motion } from "framer-motion"
import { X } from "lucide-react"
import { ProgressRing } from "./ProgressRing"
import { formatTime } from "@/utils/formatTime"
import {
  enterFocusModePlatform,
  exitFocusModePlatform,
  watchBrowserFullscreenExit
} from "@/utils/focusModePlatform"

type Props = {
  time: number
  totalTime: number
  sessions: number
  dailyFocus: number
  exitFocus: () => void
}

export function FocusMode({ time, totalTime, sessions, dailyFocus, exitFocus }: Props) {
  const progress = Math.min(1, Math.max(0, 1 - time / totalTime))

  const warningPlayed = useRef(false)
  const finishPlayed = useRef(false)
  const warningSound = useRef(new Audio("/sounds/warning.mp3"))
  const finishSound = useRef(new Audio("/sounds/finish.mp3"))
  const ambient = useRef(new Audio("/sounds/rain.mp3"))

  // Stable ref so the cleanup closure always calls the latest exitFocus
  const exitFocusRef = useRef(exitFocus)
  useEffect(() => {
    exitFocusRef.current = exitFocus
  }, [exitFocus])

  const nearEnd = time <= 10

  useEffect(() => {
    const ambientEl = ambient.current
    ambientEl.loop = true
    ambientEl.volume = 0.15
    ambientEl.play().catch(() => {})

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") exitFocusRef.current()
      if (e.ctrlKey || e.altKey || e.metaKey) e.preventDefault()
    }
    window.addEventListener("keydown", handleKey)

    enterFocusModePlatform()
    const stopWatchingFullscreen = watchBrowserFullscreenExit(() => exitFocusRef.current())

    return () => {
      ambientEl.pause()
      window.removeEventListener("keydown", handleKey)
      stopWatchingFullscreen()
      exitFocusModePlatform()
      // NOTE: don't call exitFocusRef here — the parent owns focusMode state
      // and resets it when pomodoro.mode leaves "focus". Calling it here would
      // close the screen during React strict-mode's mount/unmount/mount probe.
    }
  }, [])

  useEffect(() => {
    if (time <= 30 && !warningPlayed.current) {
      warningPlayed.current = true
      warningSound.current.volume = 0.25
      warningSound.current.play().catch(() => {})
    }
    if (time === 0 && !finishPlayed.current) {
      finishPlayed.current = true
      finishSound.current.volume = 0.4
      finishSound.current.play().catch(() => {})
    }
  }, [time])

  return (
    <motion.div
      className="relative flex items-center justify-center h-screen w-screen overflow-hidden bg-background"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Ambient gradient — pulses subtly with progress for a "breathing" feel */}
      <motion.div
        className="pointer-events-none absolute inset-0"
        animate={{
          background: `radial-gradient(ellipse at center,
            color-mix(in oklch, var(--primary) ${8 + progress * 14}%, transparent) 0%,
            transparent 60%)`
        }}
        transition={{ duration: 1.2 }}
      />

      {/* Exit button — subtle, always visible */}
      <button
        onClick={() => exitFocusRef.current()}
        title="Sair do modo foco (ESC)"
        className="no-drag absolute top-5 right-5 p-2 rounded-full text-foreground/40 hover:text-foreground hover:bg-muted/40 transition-colors"
      >
        <X size={18} />
      </button>

      {/* Progress ring + timer */}
      <div className="relative flex items-center justify-center">
        <motion.div
          animate={{
            filter: `drop-shadow(0 0 ${progress * 26}px color-mix(in oklch, var(--primary) 65%, transparent))`
          }}
          transition={{ duration: 0.5 }}
        >
          <ProgressRing progress={progress} />
        </motion.div>

        <motion.div
          key={time}
          animate={{ scale: nearEnd ? [1, 1.06, 1] : 1 }}
          transition={{ duration: 0.8 }}
          className="absolute flex flex-col items-center"
        >
          <div className="text-6xl font-bold tabular-nums tracking-tight">
            {formatTime(time)}
          </div>
          <div className="mt-2 text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
            Foco
          </div>
        </motion.div>
      </div>

      {/* Stats */}
      <div className="absolute bottom-8 left-8 text-xs text-muted-foreground/70 space-y-1 font-mono">
        <div>
          <span className="opacity-60">Sessões:</span>{" "}
          <span className="text-foreground/80">{sessions}</span>
        </div>
        <div>
          <span className="opacity-60">Tempo de foco:</span>{" "}
          <span className="text-foreground/80">{formatTime(dailyFocus)}</span>
        </div>
      </div>

      <div className="absolute bottom-8 right-8 text-[10px] uppercase tracking-widest text-muted-foreground/50">
        ESC para sair
      </div>
    </motion.div>
  )
}
