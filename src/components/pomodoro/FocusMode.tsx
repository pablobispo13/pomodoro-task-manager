import { useEffect, useRef } from "react"
import { motion } from "framer-motion"
import { ProgressRing } from "./ProgressRing"
import { formatTime } from "@/utils/formatTime"

type Props = {
  time: number
  totalTime: number
  sessions: number
  dailyFocus: number
  exitFocus: () => void
}

export function FocusMode({
  time,
  totalTime,
  sessions,
  dailyFocus,
  exitFocus
}: Props) {

  const progress = Math.min(1, Math.max(0, 1 - time / totalTime))

  const warningPlayed = useRef(false)
  const finishPlayed = useRef(false)

  const warningSound = useRef(new Audio("/sounds/warning.mp3"))
  const finishSound = useRef(new Audio("/sounds/finish.mp3"))
  const ambient = useRef(new Audio("/sounds/rain.mp3"))

  const nearEnd = time <= 10

  useEffect(() => {

    window.windowControls.enterFocusMode()

    ambient.current.loop = true
    ambient.current.volume = 0.15
    ambient.current.play()

    const handleKey = (e: KeyboardEvent) => {

      if (e.key === "Escape") exitFocus()

      if (e.ctrlKey || e.altKey || e.metaKey) {
        e.preventDefault()
      }

    }

    window.addEventListener("keydown", handleKey)

    return () => {
      ambient.current.pause()
      window.windowControls.exitFocusMode()
      window.removeEventListener("keydown", handleKey)
    }

  }, [])

  useEffect(() => {

    if (time <= 30 && !warningPlayed.current) {
      warningPlayed.current = true
      warningSound.current.volume = 0.25
      warningSound.current.play()
    }

    if (time === 0 && !finishPlayed.current) {
      finishPlayed.current = true
      finishSound.current.volume = 0.4
      finishSound.current.play()
    }

  }, [time])

  return (

    <motion.div
      className="flex items-center justify-center h-screen w-screen bg-background"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >

      <div className="relative flex items-center justify-center">

        <motion.div
          animate={{
            filter: `drop-shadow(0 0 ${progress * 22}px rgba(99,102,241,0.8))`
          }}
        >
          <ProgressRing progress={progress} />
        </motion.div>

        <motion.div
          key={time}
          animate={{
            scale: nearEnd ? [1, 1.08, 1] : 1
          }}
          transition={{ duration: 0.8 }}
          className="absolute flex flex-col items-center"
        >

          <div className="text-4xl font-bold tabular-nums">
            {formatTime(time)}
          </div>

        </motion.div>

      </div>

      <div className="absolute bottom-8 left-8 text-xs opacity-40 space-y-1">

        <div>Sessões: {sessions}</div>
        <div>Tempo de foco do dia: {formatTime(dailyFocus)}</div>

      </div>

      <div className="absolute bottom-8 right-8 text-xs opacity-30">
        Pressione ESC para sair
      </div>

    </motion.div>

  )
}