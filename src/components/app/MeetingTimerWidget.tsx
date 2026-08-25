import { Square, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { formatTime } from "@/utils/formatTime"
import { cn } from "@/lib/utils"

type Props = {
  collapsed: boolean
  running: boolean
  elapsed: number
  onStart: () => void
  onStop: () => void
}

export function MeetingTimerWidget({ collapsed, running, elapsed, onStart, onStop }: Props) {
  if (running) {
    return (
      <div
        className={cn(
          "mt-auto flex flex-col gap-1.5 p-2 rounded-lg bg-amber-500/10 border border-amber-500/30",
          collapsed && "items-center"
        )}
      >
        {!collapsed && (
          <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 tracking-widest px-1">
            REUNIÃO
          </span>
        )}
        <span
          className={cn(
            "font-mono font-bold tabular-nums text-amber-600 dark:text-amber-400 px-1",
            collapsed ? "text-[10px]" : "text-sm"
          )}
        >
          {formatTime(elapsed)}
        </span>
        <Button
          size="sm"
          variant="ghost"
          onClick={onStop}
          title="Parar reunião"
          className="h-7 gap-1.5 text-amber-700 dark:text-amber-400 hover:bg-amber-500/15 hover:text-amber-700"
        >
          <Square size={12} />
          {!collapsed && "Parar"}
        </Button>
      </div>
    )
  }

  return (
    <Button
      variant="ghost"
      onClick={onStart}
      title={collapsed ? "Iniciar reunião" : undefined}
      className="mt-auto justify-start gap-2 h-9 text-muted-foreground hover:text-foreground"
    >
      <Users size={18} className="shrink-0" />
      {!collapsed && <span className="truncate">Iniciar reunião</span>}
    </Button>
  )
}
