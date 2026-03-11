import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { motion } from "framer-motion"
import { formatTime } from "@/utils/formatTime"
import { ProgressRing } from "./ProgressRing"

type Props = {
  time: number
  totalTime: number
  running: boolean
  mode: string
  cycle: number
  sessions: number
  dailyFocus: number
  skip: () => void
  start: () => void
  pause: () => void
  reset: () => void
  enterFocus: () => void
  addTime: (seconds: number) => void
}

export function PomodoroView({
  time,
  totalTime,
  running,
  mode,
  cycle,
  sessions,
  dailyFocus,
  start,
  pause,
  reset,
  skip,
  enterFocus,
  addTime
}: Props) {

  const progress = Math.min(1, Math.max(0, 1 - time / totalTime))

  const modeLabel = {
    focus: "Foco",
    shortBreak: "Pausa pequena",
    longBreak: "Pausa longa"
  }[mode]

  return (

    <Card className="w-[360px]">
      <CardContent className="flex flex-col items-center gap-6 p-8">

        <div className="text-center">

          <div className="text-xs opacity-60 tracking-widest">
            {modeLabel}
          </div>

          <div className="text-xs opacity-40">
            Ciclo: {cycle} / 4
          </div>

        </div>

        <div className="relative flex items-center justify-center">

          <ProgressRing progress={progress} />

          <motion.div
            key={time}
            initial={{ scale: 0.96 }}
            animate={{ scale: 1 }}
            className="absolute text-5xl font-bold tabular-nums"
          >
            {formatTime(time)}
          </motion.div>

        </div>

        {/* quick adjust */}

        <div className="flex gap-2">

          <Button size="sm" variant="outline" onClick={() => addTime(60)}>
            +1m
          </Button>

          <Button size="sm" variant="outline" onClick={() => addTime(300)}>
            +5m
          </Button>

          <Button size="sm" variant="outline" onClick={() => addTime(600)}>
            +10m
          </Button>

        </div>

        <div className="flex gap-2">

          {!running ? (
            <Button onClick={start}>
              Começar
            </Button>
          ) : (
            <Button onClick={pause}>
              Pausar
            </Button>
          )}

          <Button variant="secondary" onClick={reset}>
            Resetar
          </Button>

          <Button variant="outline" onClick={enterFocus}>
            Modo Foco
          </Button>
          <Button variant="outline" onClick={skip}>
            Pular
          </Button>
        </div>

        {/* stats */}

        <div className="text-xs opacity-50 text-center space-y-1">

          <div>Sessões hoje: {sessions}</div>

          <div>Tempo de foco do dia: {formatTime(dailyFocus)}</div>
        </div>
      </CardContent>
    </Card>

  )
}