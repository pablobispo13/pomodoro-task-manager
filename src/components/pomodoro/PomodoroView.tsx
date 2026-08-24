import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { motion } from "framer-motion"
import { formatTime } from "@/utils/formatTime"
import { ProgressRing } from "./ProgressRing"
import { cn } from "@/lib/utils"
import type { Task } from "@/hooks/useTasks"

type Props = {
  time: number
  totalTime: number
  running: boolean
  mode: string
  sessionInCycle: number
  sessionsBeforeLongBreak: number
  sessions: number
  dailyFocus: number
  activeTask?: Task | null
  skip: () => void
  start: () => void
  pause: () => void
  reset: () => void
  enterFocus: () => void
  addTime: (seconds: number) => void
}

const modeLabel: Record<string, string> = {
  focus: "Foco",
  shortBreak: "Pausa Curta",
  longBreak: "Pausa Longa"
}

const startLabel: Record<string, string> = {
  focus: "Começar Foco",
  shortBreak: "Começar Pausa",
  longBreak: "Começar Pausa"
}

export function PomodoroView({
  time,
  totalTime,
  running,
  mode,
  sessionInCycle,
  sessionsBeforeLongBreak,
  sessions,
  dailyFocus,
  activeTask,
  start,
  pause,
  reset,
  skip,
  enterFocus,
  addTime
}: Props) {
  const progress = Math.min(1, Math.max(0, 1 - time / totalTime))
  const isFocus = mode === "focus"

  return (
    <Card className="w-[380px]">
      <CardContent className="flex flex-col items-center gap-5 p-8">

        {/* Mode label + cycle dots */}
        <div className="text-center space-y-2">
          <div className="text-xs font-semibold tracking-widest uppercase text-primary">
            {modeLabel[mode] ?? mode}
          </div>

          <div className="flex gap-1.5 justify-center">
            {Array.from({ length: sessionsBeforeLongBreak }, (_, i) => (
              <div
                key={i}
                className={cn(
                  "w-1.5 h-1.5 rounded-full transition-all duration-300",
                  i < sessionInCycle - (isFocus ? 0 : 1)
                    ? "bg-primary"
                    : i === sessionInCycle - 1 && isFocus
                      ? "bg-primary/50 animate-pulse"
                      : "bg-muted-foreground/20"
                )}
              />
            ))}
          </div>
        </div>

        {/* Progress ring + timer */}
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

        {/* Active task */}
        {activeTask && (
          <div className="w-full border border-primary/20 bg-primary/8 rounded-lg px-3 py-2 text-xs text-center">
            <span className="text-muted-foreground">Focando em: </span>
            <span className="font-medium">{activeTask.title}</span>
          </div>
        )}

        {/* Quick adjust — only during focus */}
        {isFocus && (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => addTime(60)}>+1m</Button>
            <Button size="sm" variant="outline" onClick={() => addTime(300)}>+5m</Button>
            <Button size="sm" variant="outline" onClick={() => addTime(600)}>+10m</Button>
          </div>
        )}

        {/* Controls */}
        <div className="flex gap-2 flex-wrap justify-center">
          {!running ? (
            <Button onClick={start}>{startLabel[mode] ?? "Começar"}</Button>
          ) : (
            <Button onClick={pause}>Pausar</Button>
          )}

          <Button variant="secondary" onClick={reset}>Resetar</Button>

          <Button
            variant="outline"
            onClick={enterFocus}
            disabled={!isFocus}
            title={!isFocus ? "Disponível apenas durante o foco" : undefined}
          >
            Modo Foco
          </Button>

          <Button variant="outline" onClick={skip}>Pular</Button>
        </div>

        {/* Stats */}
        <div className="text-xs text-muted-foreground text-center space-y-1">
          <div>Sessões hoje: <span className="font-medium">{sessions}</span></div>
          <div>Foco total: <span className="font-medium">{formatTime(dailyFocus)}</span></div>
        </div>

      </CardContent>
    </Card>
  )
}
